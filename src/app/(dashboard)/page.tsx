'use client'

import styles from './dashboard.module.css';
import { TrendingUp, Users, Package, AlertTriangle, XCircle, CheckCircle, Clock, FileText } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { useMemo, useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { startOfDay, endOfDay, subDays, startOfWeek, startOfMonth, subMonths, endOfMonth, isWithinInterval, format } from 'date-fns';
import { supabase } from '@/lib/supabase/client';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function Dashboard() {
  const [dateFilter, setDateFilter] = useState('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [userRole, setUserRole] = useState('admin');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function getUser() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUserId(user.id);
            // In a real app, you'd fetch the role from the staff table based on auth user
            // For now, we simulate admin. To test cashier, change this to 'cashier'.
            setUserRole('admin'); 
        }
    }
    getUser();
  }, []);

  const products = useLiveQuery(() => localDB.products.toArray(), []) || [];
  const sales = useLiveQuery(() => localDB.sales.toArray(), []) || [];
  const saleItems = useLiveQuery(() => localDB.saleItems.toArray(), []) || [];
  const customers = useLiveQuery(() => localDB.customers.toArray(), []) || [];
  const categories = useLiveQuery(() => localDB.categories.toArray(), []) || [];

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (dateFilter) {
      case 'today': return { start: startOfDay(now), end: endOfDay(now) };
      case 'yesterday': return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) };
      case 'this_week': return { start: startOfWeek(now), end: endOfDay(now) };
      case 'this_month': return { start: startOfMonth(now), end: endOfDay(now) };
      case 'last_month': 
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'custom':
        return { 
          start: customStart ? startOfDay(new Date(customStart)) : startOfDay(now), 
          end: customEnd ? endOfDay(new Date(customEnd)) : endOfDay(now) 
        };
      default: return { start: new Date(0), end: new Date() };
    }
  }, [dateFilter, customStart, customEnd]);

  // Filters based on date and role
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const saleDate = new Date(sale.sale_date);
      const isDateValid = isWithinInterval(saleDate, dateRange);
      const isRoleValid = userRole === 'admin' || sale.staff_id === userId;
      return isDateValid && isRoleValid;
    });
  }, [sales, dateRange, userRole, userId]);

  const filteredSaleItems = useMemo(() => {
    const validSaleIds = new Set(filteredSales.map(s => s.id));
    return saleItems.filter((item: any) => validSaleIds.has(item.sale_id));
  }, [saleItems, filteredSales]);

  // Calculations
  const totalSalesAmount = filteredSales.reduce((sum: number, sale: any) => sum + sale.total, 0);
  
  // Profit: (unit_price - purchase_price) * quantity - discount
  const totalProfit = filteredSaleItems.reduce((sum: number, item: any) => {
      const baseProfit = (item.unit_price - item.purchase_price) * item.quantity;
      return sum + baseProfit - item.discount_amount;
  }, 0);

  const totalDue = customers.reduce((sum: number, cust: any) => sum + cust.total_due, 0);
  const activeProducts = products.filter(p => p.is_active).length;
  
  const lowStockProducts = products.filter(p => p.stock <= p.low_stock_alert && p.stock > 0);
  const outOfStockProducts = products.filter(p => p.stock === 0);

  const todayCreditSales = filteredSales.filter(s => s.due_amount > 0);
  const recentSales = [...filteredSales].sort((a: any, b: any) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()).slice(0, 10);

  // Charts Data
  const salesTrendData = useMemo(() => {
    const grouped: any = {};
    filteredSales.forEach((sale: any) => {
        const date = format(new Date(sale.sale_date), 'MMM dd');
        if(!grouped[date]) grouped[date] = 0;
        grouped[date] += sale.total;
    });
    return Object.keys(grouped).map(key => ({ date: key, sales: grouped[key] }));
  }, [filteredSales]);

  const topProductsData = useMemo(() => {
      const grouped: any = {};
      filteredSaleItems.forEach((item: any) => {
          if(!grouped[item.product_name]) grouped[item.product_name] = 0;
          grouped[item.product_name] += item.quantity;
      });
      return Object.keys(grouped)
        .map(key => ({ name: key.substring(0, 15), quantity: grouped[key] }))
        .sort((a: any, b: any) => b.quantity - a.quantity)
        .slice(0, 5);
  }, [filteredSaleItems]);

  const categorySalesData = useMemo(() => {
      const grouped: any = {};
      filteredSaleItems.forEach((item: any) => {
          const product = products.find(p => p.id === item.product_id);
          const category = categories.find(c => c.id === product?.category_id);
          const catName = category?.name || 'Uncategorized';
          if(!grouped[catName]) grouped[catName] = 0;
          grouped[catName] += item.total;
      });
      return Object.keys(grouped).map(key => ({ name: key, value: grouped[key] }));
  }, [filteredSaleItems, products, categories]);

  const paymentMethodData = useMemo(() => {
      // Mocking payment methods based on sale status since we don't sync sale_payments yet
      let cash = 0, due = 0;
      filteredSales.forEach(s => {
          cash += s.paid_amount;
          due += s.due_amount;
      });
      return [
          { name: 'Cash/Paid', value: cash },
          { name: 'Due', value: due }
      ];
  }, [filteredSales]);

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1>Dashboard</h1>
        <div className={styles.filterGroup}>
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
            <option value="today">আজ (Today)</option>
            <option value="yesterday">গতকাল (Yesterday)</option>
            <option value="this_week">এই সপ্তাহ (This Week)</option>
            <option value="this_month">এই মাস (This Month)</option>
            <option value="last_month">গত মাস (Last Month)</option>
            <option value="custom">Custom Range</option>
          </select>
          {dateFilter === 'custom' && (
              <div className={styles.customDate}>
                  <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                  <span>-</span>
                  <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
              </div>
          )}
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.card}>
          <div className={styles.cardIcon} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <TrendingUp size={24} />
          </div>
          <div className={styles.cardInfo}>
            <p className={styles.cardLabel}>{userRole === 'admin' ? 'মোট বিক্রি' : 'আপনার বিক্রি'}</p>
            <h3 className={styles.cardValue}>৳ {totalSalesAmount.toLocaleString()}</h3>
          </div>
        </div>
        
        {userRole === 'admin' && (
            <>
                <div className={styles.card}>
                <div className={styles.cardIcon} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                    <CheckCircle size={24} />
                </div>
                <div className={styles.cardInfo}>
                    <p className={styles.cardLabel}>মোট লাভ</p>
                    <h3 className={styles.cardValue}>৳ {totalProfit.toLocaleString()}</h3>
                </div>
                </div>

                <div className={styles.card}>
                <div className={styles.cardIcon} style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                    <Clock size={24} />
                </div>
                <div className={styles.cardInfo}>
                    <p className={styles.cardLabel}>মোট বাকি</p>
                    <h3 className={styles.cardValue}>৳ {totalDue.toLocaleString()}</h3>
                </div>
                </div>
            </>
        )}

        {userRole === 'cashier' && (
            <div className={styles.card}>
              <div className={styles.cardIcon} style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                <FileText size={24} />
              </div>
              <div className={styles.cardInfo}>
                <p className={styles.cardLabel}>Transactions</p>
                <h3 className={styles.cardValue}>{filteredSales.length}</h3>
              </div>
            </div>
        )}

        <div className={styles.card}>
          <div className={styles.cardIcon} style={{ backgroundColor: 'rgba(100, 116, 139, 0.1)', color: '#64748b' }}>
            <Package size={24} />
          </div>
          <div className={styles.cardInfo}>
            <p className={styles.cardLabel}>মোট পণ্য</p>
            <h3 className={styles.cardValue}>{activeProducts}</h3>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardIcon} style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <AlertTriangle size={24} />
          </div>
          <div className={styles.cardInfo}>
            <p className={styles.cardLabel}>Low Stock</p>
            <h3 className={styles.cardValue}>{lowStockProducts.length}</h3>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardIcon} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <XCircle size={24} />
          </div>
          <div className={styles.cardInfo}>
            <p className={styles.cardLabel}>Out of Stock</p>
            <h3 className={styles.cardValue}>{outOfStockProducts.length}</h3>
          </div>
        </div>
      </div>

      <div className={styles.chartGrid}>
          <div className={styles.chartBox}>
              <h2>Sales Trend</h2>
              <div style={{height: 250}}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
              </div>
          </div>
          
          <div className={styles.chartBox}>
              <h2>Top 5 Products</h2>
              <div style={{height: 250}}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProductsData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} />
                        <Tooltip />
                        <Bar dataKey="quantity" fill="#10b981" />
                    </BarChart>
                </ResponsiveContainer>
              </div>
          </div>

          <div className={styles.chartBox}>
              <h2>Category Sales</h2>
              <div style={{height: 250}}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={categorySalesData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                            {categorySalesData.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
              </div>
          </div>

          <div className={styles.chartBox}>
              <h2>Payment Methods</h2>
              <div style={{height: 250}}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={paymentMethodData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                            {paymentMethodData.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
              </div>
          </div>
      </div>

      <div className={styles.listGrid}>
        <div className={styles.listBox}>
          <h2>সাম্প্রতিক বিক্রি (Recent Sales)</h2>
          <table className={styles.table}>
              <thead>
                  <tr>
                      <th>Invoice</th>
                      <th>Total</th>
                      <th>Status</th>
                  </tr>
              </thead>
              <tbody>
                  {recentSales.map(sale => (
                      <tr key={sale.id}>
                          <td>{sale.invoice_no}</td>
                          <td>৳ {sale.total}</td>
                          <td>
                              <span className={`${styles.badge} ${sale.payment_status === 'paid' ? styles.badgePaid : styles.badgeDue}`}>
                                  {sale.payment_status}
                              </span>
                          </td>
                      </tr>
                  ))}
                  {recentSales.length === 0 && <tr><td colSpan={3} style={{textAlign:'center'}}>No recent sales</td></tr>}
              </tbody>
          </table>
        </div>

        <div className={styles.listBox}>
          <h2>আজকের বাকি (Credit Sales)</h2>
          <table className={styles.table}>
              <thead>
                  <tr>
                      <th>Invoice</th>
                      <th>Due Amount</th>
                  </tr>
              </thead>
              <tbody>
                  {todayCreditSales.map(sale => (
                      <tr key={sale.id}>
                          <td>{sale.invoice_no}</td>
                          <td style={{color: '#ef4444', fontWeight: 600}}>৳ {sale.due_amount}</td>
                      </tr>
                  ))}
                  {todayCreditSales.length === 0 && <tr><td colSpan={2} style={{textAlign:'center'}}>No dues for selected period</td></tr>}
              </tbody>
          </table>
        </div>
        
        <div className={styles.listBox}>
          <h2>Low Stock Alert</h2>
          <div className={styles.alertList}>
            {lowStockProducts.length === 0 && (
              <p style={{color: 'var(--text-muted)'}}>No low stock items!</p>
            )}
            {lowStockProducts.map(product => (
              <div key={product.id} className={styles.alertItem}>
                <AlertTriangle size={18} color="#f59e0b" />
                <div className={styles.alertInfo}>
                  <p>{product.name}</p>
                  <span style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Only {product.stock} left</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
