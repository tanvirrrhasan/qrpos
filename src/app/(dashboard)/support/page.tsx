'use client'

import React, { useState } from 'react';
import { 
    HelpCircle, Search, Home, ShoppingCart, Package, QrCode, FolderTree, 
    Archive, Truck, FileText, Users, Wallet, FileBarChart, MonitorSmartphone, 
    UsersRound, Settings, ShieldCheck, Printer, CheckCircle, Info, RefreshCw,
    Lock, ArrowRight, BookOpen
} from 'lucide-react';
import styles from './support.module.css';

interface DocSection {
    id: string;
    title: string;
    route: string;
    icon: any;
    category: string;
    description: string;
    features: { title: string; desc: string }[];
}

export default function SupportPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('all');

    const docs: DocSection[] = [
        {
            id: 'dashboard',
            title: '১. ড্যাশবোর্ড (Dashboard Overview)',
            route: '/',
            icon: Home,
            category: 'general',
            description: 'ব্যবসার সার্বিক পরিস্থিতি, বিক্রয়, লাভ-ক্ষতি, লো স্টক অ্যালার্ট এবং দ্রুত কাজের শর্টকাট একনজরে দেখার কেন্দ্রীয় নিয়ন্ত্রণ কক্ষ।',
            features: [
                { title: 'লাইভ মেট্রিক্স কার্ডস', desc: 'আজকের মোট বিক্রয় (Sales), আনুমানিক লাভ (Profit), মোট বাকি পাওনা (Total Due) এবং লো স্টক আইটেম সংখ্যা রিয়েলটাইমে দেখা যায়।' },
                { title: 'বিক্রয় ও লাভ গ্রাফ', desc: 'দৈনিক ও সাপ্তাহিক বিক্রয়ের ওঠানামা এবং লাভের ভিজ্যুয়াল চার্ট পর্যবেক্ষণ।' },
                { title: 'কুইক শর্টকাট বাটন্স', desc: 'এক ক্লিকে নতুন সেল চালু করা, নতুন প্রোডাক্ট যোগ করা বা কাস্টমার প্যানেলে যাওয়ার বাটন।' },
                { title: 'সাম্প্রতিক ইনভয়েস ও টপ সেলিং প্রোডাক্টস', desc: 'সর্বশেষ সম্পন্ন হওয়া বিক্রিগুলো এবং দোকানে সবচেয়ে বেশি বিক্রি হওয়া পণ্যের র্যাঙ্কিং তালিকা।' }
            ]
        },
        {
            id: 'pos',
            title: '২. বিক্রয় কাউন্টার (POS - Point of Sale)',
            route: '/pos',
            icon: ShoppingCart,
            category: 'pos',
            description: 'ক্যাশ কাউন্টারে দ্রুত গতিতে পণ্য স্ক্যান, বিল তৈরি, ডিসকাউন্টপ্রদান ও রসিদ প্রিন্ট করার মূল মডিউল।',
            features: [
                { title: 'বারকোড স্ক্যানার ও কিউআর সাপোর্ট', desc: 'বারকোড স্ক্যানার দিয়ে স্ক্যান করলেই তাৎক্ষণিকভাবে পণ্য কার্টে যুক্ত হয়।' },
                { title: 'প্রোডাক্ট ভ্যারিয়েন্ট সিলেকশন', desc: 'পণ্য যোগ করার সময় সাইজ, কালার বা ভ্যারিয়েন্ট পপআপ থেকে নির্দিষ্ট পণ্য নির্বাচন করা।' },
                { title: 'কার্ট অ্যাডজাস্টমেন্ট ও ডিসকাউন্ট', desc: 'কার্টের ভেতরে পণ্যের পরিমাণ বাড়ানো/কমানো, একক আইটেমে ডিসকাউন্ট বা পুরো ইনভয়েসে টাকা/শতাংশে ছাড় দেওয়া।' },
                { title: 'গ্রাহক নির্বাচন (Customer Selection)', desc: 'নিয়মিত কাস্টমার নির্বাচন করা বা নতুন ওয়াক-ইন কাস্টমারের নামে মেমো করা।' },
                { title: 'মাল্টিপল পেমেন্ট মেথড ও বাকি সেল', desc: 'ক্যাশ, বিকাশ, নগদ, রকেট, ব্যাংক কার্ডের মাধ্যমে পেমেন্ট গ্রহণ বা আংশিক বাকি (Due) রেখে সেল সম্পন্ন করা।' },
                { title: 'অটো রসিদ প্রিন্টিং ও ডিজিটাল কিউআর', desc: 'থার্মাল প্রিন্টারে তাতক্ষণিক রসিদ প্রিন্ট এবং মেমোর ওপর কিউআর কোড জেনারেট হওয়া।' }
            ]
        },
        {
            id: 'products',
            title: '৩. পণ্য ব্যবস্থাপনা (Products Management)',
            route: '/products',
            icon: Package,
            category: 'inventory',
            description: 'দোকানের সকল পণ্যের তালিকা সংরক্ষণ, নতুন প্রোডাক্ট যোগ, দাম নির্ধারণ এবং ছবি ও ভ্যারিয়েন্ট মেইনটেইন করা।',
            features: [
                { title: 'নতুন পণ্য এন্ট্রি', desc: 'পণের নাম, ক্যাটাগরি, ব্রান্ড, ক্রয়মূল্য (Purchase Price), বিক্রয়মূল্য (Selling Price), স্টক পরিমাণ ও ছবি আপলোড।' },
                { title: 'অটো SKU ও বারকোড জেনারেটর', desc: 'বারকোড না থাকলে সিস্টেম স্বয়ংক্রিয়ভাবে ইউনিক SKU ও বারকোড তৈরি করে দেয়।' },
                { title: 'প্রোডাক্ট ভ্যারিয়েন্ট (Variants)', desc: 'একই পণ্যের বিভিন্ন সাইজ (S, M, L, XL) বা কালার অনুযায়ী আলাদা স্টক ও দাম নির্ধারণ।' },
                { title: 'লো স্টক অ্যালার্ট লিমিট', desc: 'পণ্য কত পিসে নামলে সিস্টেমে ওয়ার্নিং অ্যালার্ট দেবে তা সেট করে রাখা।' }
            ]
        },
        {
            id: 'qr',
            title: '৪. কিউআর ও বারকোড লেবেল জেনারেটর (QR Labels)',
            route: '/qr',
            icon: QrCode,
            category: 'qr',
            description: 'পণ্যে লাগানোর জন্য বারকোড স্টিকার এবং কিউআর কোড প্রিন্ট করার জন্য ডেডিকেটেড লেবেল টুল।',
            features: [
                { title: 'থার্মাল পেপার ও স্টিকার সাইজ', desc: '৫৮ মিমি, ৮০ মিমি থার্মাল পেপার বা A4 স্টিকার শিটের জন্য সাইজ নির্বাচন।' },
                { title: 'লেবেল স্কেলিং (Small, Medium, Large)', desc: 'পণ্যের গায়ে আঁটানোর জন্য লেবেলের সাইজ ছোট বা বড় করা।' },
                { title: 'কিউআর কোড মোড', desc: 'লেবেলে কিউআর কোড স্ক্যান করলে সরাসরি SKU টেক্সট দেখাবে নাকি পণ্যের অনলাইন পাবলিক পেজ খুলবে তা সেট করা।' }
            ]
        },
        {
            id: 'categories',
            title: '৫. ক্যাটাগরি গ্রুপ (Categories Management)',
            route: '/categories',
            icon: FolderTree,
            category: 'inventory',
            description: 'পণ্যগুলোকে সহজে খুঁজে পাওয়ার জন্য বিভিন্ন ক্যাটাগরি ও সাব-ক্যাটাগরিতে ভাগ করে রাখা।',
            features: [
                { title: 'প্যারেন্ট ও সাব-ক্যাটাগরি', desc: 'মূল ক্যাটাগরির অধীনে একাধিক সাব-ক্যাটাগরি তৈরি করার সুবিধা।' },
                { title: 'কালার ট্যাগ ও আইকন', desc: 'POS কাউন্টারে চেনার সুবিধার জন্য ক্যাটাগরিতে পছন্দমতো কালার ও Lucide আইকন বসানো।' }
            ]
        },
        {
            id: 'inventory',
            title: '৬. ইনভেন্টরি ও স্টক মেলানো (Inventory & Stock)',
            route: '/inventory',
            icon: Archive,
            category: 'inventory',
            description: 'দোকানের মোট পণ্যের বর্তমান স্টক ভ্যালুয়েশন এবং হারিয়ে যাওয়া/নষ্ট হওয়া পণ্য সমন্বয়ের কেন্দ্রীয় পেজ।',
            features: [
                { title: 'মোট স্টক ভ্যালুয়েশন', desc: 'দোকানে বর্তমানে কত টাকার মালামাল মজুত আছে তার হিসাব দেখা।' },
                { title: 'স্টক সমন্বয় (Stock Adjustment Modal)', desc: 'বাস্তব গণনার সাথে স্টক মিলাতে Add (+), Remove (-), অথবা Set Exact (=) বাটনের মাধ্যমে স্টক আপডেট করা।' },
                { title: 'সমন্বয়ের কারণ ট্র্যাকিং', desc: 'স্টক মেলানোর কারণ (নষ্ট পণ্য, চুরি/হারানো, নতুন স্টক, কাস্টমার ফেরত) সিলেক্ট করে রাখা।' },
                { title: 'স্টক পরিবর্তনের ইতিহাস (Stock History)', desc: 'কোন পণ্য কে কখন কত পিস বাড়িয়েছিল বা কমিয়েছিল তার বিস্তারিত টাইমলাইন দেখা।' }
            ]
        },
        {
            id: 'purchases',
            title: '৭. পণ্য ক্রয় ও স্টক ইন (Purchases / Stock In)',
            route: '/purchases',
            icon: Truck,
            category: 'purchases',
            description: 'সাপ্লায়ারের কাছ থেকে পাইকারি মালামাল ক্রয় এবং দোকানে নতুন স্টক তোলার হিসাব।',
            features: [
                { title: 'নতুন পারচেজ এন্ট্রি', desc: 'সাপ্লায়ার নির্বাচন করে ক্রয় করা পণ্যের তালিকা, পরিমাণ ও ক্রয়মূল্য বসানো।' },
                { title: 'অটোমেটিক স্টক বৃদ্ধি', desc: 'ক্রয় সেভ করার সাথে সাথে পণ্যের স্টক স্বয়ংক্রিয়ভাবে ইনভেন্টরিতে বেড়ে যায়।' },
                { title: 'সাপ্লায়ার বাকি ও পেমেন্ট', desc: 'ক্রয়ের সময় নগদ পেমেন্ট বা বাকি (Due) পরিমাণের হিসাব রাখা।' }
            ]
        },
        {
            id: 'sales',
            title: '৮. বিক্রয় ইতিহাস ও ইনভয়েস (Sales History & Return)',
            route: '/sales',
            icon: FileText,
            category: 'pos',
            description: 'পূর্বে সম্পন্ন হওয়া সকল বিক্রয় মেমোর তালিকা, রসিদ পুন:প্রিন্ট এবং পণ্য ফেরত (Return) নেওয়ার ব্যবস্থা।',
            features: [
                { title: 'ইনভয়েস ফিল্টার ও সার্চ', desc: 'তারিখ, কাস্টমারের নাম বা মেমো নম্বর দিয়ে দ্রুত রসিদ খুঁজে বের করা।' },
                { title: 'মেমো ডিটেইলস ভিউ (/sales/details)', desc: 'ইনভয়েসের বিস্তারিত পণ্য তালিকা, পেমেন্ট মাধ্যম ও বাকি তথ্য দেখা।' },
                { title: 'রসিদ পুন:প্রিন্ট (Reprint Receipt)', desc: 'এক ক্লিকে আগের যেকোনো মেমোর প্রফেশনাল থার্মাল রসিদ আবার প্রিন্ট করা।' },
                { title: 'সেলস রিটার্ন (/sales/return)', desc: 'কাস্টমার পণ্য ফেরত দিলে ইনভয়েস থেকে পণ্য রিটার্ন নেওয়া, যা অটোমেটিক ইনভেন্টরিতে স্টক বাড়িয়ে দেয় এবং কাস্টমারের বাকি সমন্বয় করে।' }
            ]
        },
        {
            id: 'customers',
            title: '৯. গ্রাহক ডিরেক্টরি (Customers Management)',
            route: '/customers',
            icon: Users,
            category: 'crm',
            description: 'দোকানের সকল কাস্টমারের তথ্য, মোট কেনাকাটার পরিমাণ এবং বাকি (Due) টাকা আদায়ের ব্যবস্থাপনা।',
            features: [
                { title: 'কাস্টমার প্রোফাইল', desc: 'কাস্টমারের নাম, ফোন নম্বর, ঠিকানা এবং লাইফটাইম মোট কেনাকাটার হিসাব।' },
                { title: 'বাকি টাকা সংগ্রহ (Receive Due Modal)', desc: 'কাস্টমারের কাছ থেকে বাকি টাকা আদায় করার জন্য কুইক ৳১০০, ৳৫০০ বা Full Amount বাটনে চেপে বিকাশ/নগদ/ক্যাশে টাকা জমা নেওয়া।' },
                { title: 'কাস্টমার লেজার (/customers/details)', desc: 'কাস্টমারের প্রতিটি কেনাকাটা এবং বাকির লেনদেনের বিস্তারিত স্টেটমেন্ট।' }
            ]
        },
        {
            id: 'suppliers',
            title: '১০. সরবরাহকারী (Suppliers Directory)',
            route: '/suppliers',
            icon: Truck,
            category: 'purchases',
            description: 'যেসব পাইকারি দোকান বা কোম্পানির কাছ থেকে মালামাল কেনা হয় তাদের তথ্য ও পাওনা বাকির হিসাব।',
            features: [
                { title: 'সাপ্লায়ার প্রোফাইল', desc: 'কোম্পানির নাম, ফোন নম্বর, কন্ট্রাক্ট পারসন ও মোট কেনাকাটা।' },
                { title: 'সাপ্লায়ার বাকি পরিশোধ (Pay Due Modal)', desc: 'সাপ্লায়ারকে বাকি টাকা শোধ করার জন্য পেমেন্ট এন্ট্রি।' },
                { title: 'সাপ্লায়ার লেজার (/suppliers/details)', desc: 'সাপ্লায়ারের কাছ থেকে কেনা সব পারচেজ ও পেমেন্ট হিস্ট্রি।' }
            ]
        },
        {
            id: 'expenses',
            title: '১১. ব্যয় ও খরচ ব্যবস্থাপনা (Expenses Management)',
            route: '/expenses',
            icon: Wallet,
            category: 'finance',
            description: 'দোকানের দৈনন্দিন পরিচালন খরচ যেমন: দোকান ভাড়া, স্টাফের বেতন, বিদ্যুৎ বিল, নাস্তা ইত্যাদির হিসাব রাখা।',
            features: [
                { title: 'খরচের ক্যাটাগরি', desc: 'ভাড়া, বিদ্যুৎ বিল, যাতায়াত, নাস্তা বা মেরামতের জন্য আলাদা ক্যাটাগরি।' },
                { title: 'খরচ এন্ট্রি ও ভাউচার', desc: 'টাকার পরিমাণ, খরচের বিবরণ ও পেমেন্ট মেথড দিয়ে খরচ সেভ করা।' }
            ]
        },
        {
            id: 'reports',
            title: '১২. রিপোর্ট ও ব্যবসা ডায়াগনস্টিকস (Reports & Analytics)',
            route: '/reports',
            icon: FileBarChart,
            category: 'finance',
            description: 'ব্যবসার লাভ-ক্ষতি, নিখুঁত হিসাব এবং ভবিষ্যতের সিদ্ধান্ত নেওয়ার জন্য বিস্তারিত রিপোর্ট।',
            features: [
                { title: 'দৈনিক ও তারিখভিত্তিক সেলস রিপোর্ট', desc: 'প্রতিদিনের মোট বিক্রি ও কাস্টমার কালেকশনের হিসাব।' },
                { title: 'লাভ-ক্ষতি রিপোর্ট (Profit & Loss)', desc: 'মোট বিক্রয়মূল্য থেকে পণ্যের ক্রয়মূল্য ও আনুষঙ্গিক খরচ বাদ দিয়ে প্রকৃত খাঁটি লাভ বের করা।' },
                { title: 'স্টক ও ইনভেন্টরি রিপোর্ট', desc: 'দোকানের প্রতিটি পণ্যের অবশিষ্টাংশ ও স্টক ভ্যালু রিপোর্ট।' },
                { title: 'বাকি ও কালেকশন রিপোর্ট', desc: 'বাজারের মোট বাকি টাকা এবং কত কালেকশন হলো তার চিত্র।' }
            ]
        },
        {
            id: 'qr-menu',
            title: '১৩. ডিজিটাল কিউআর ক্যাটালগ (QR Menu / Public Catalog)',
            route: '/qr-menu',
            icon: MonitorSmartphone,
            category: 'qr',
            description: 'কাস্টমারদের সরাসরি ফোনে দেখার জন্য ডিজিটাল ক্যাটালগ এবং ইনভয়েস ভেরিফিকেশন লিঙ্ক।',
            features: [
                { title: 'ডিজিটাল কিউআর মেনু', desc: 'কাস্টমার কিউআর স্ক্যান করলেই ফোনে দোকানের সব প্রোডাক্ট দেখতে পাবে।' },
                { title: 'পাবলিক প্রোডাক্ট পেজ (/p)', desc: 'বারকোড স্ক্যান করলে কাস্টমার প্রোডাক্টের ছবি, আসল দাম ও বিবরণ দেখতে পারবে।' }
            ]
        },
        {
            id: 'staff',
            title: '১৪. স্টাফ ও পারমিশন কন্ট্রোল (HR & Staff Management)',
            route: '/staff',
            icon: UsersRound,
            category: 'admin',
            description: 'দোকানের কর্মচারীদের জন্য আলাদা ইউজার অ্যাকাউন্ট তৈরি এবং কার কী এক্সেস থাকবে তা নিয়ন্ত্রণ করা।',
            features: [
                { title: 'অটোমেটিক স্টাফ অ্যাকাউন্ট তৈরি', desc: 'স্টাফের ইমেইল ও পাসওয়ার্ড দিলে সাথে সাথে সেটিতে লগইন করার অ্যাকাউন্ট তৈরি হয়ে যায়।' },
                { title: 'রোল ও পারমিশন ম্যাট্রিক্স', desc: 'Owner, Admin, Manager, Cashier ভূমিকা অনুযায়ী কার কিসে এক্সেস থাকবে (যেমন: ক্যাশিয়ার সেল করতে পারবে কিন্তু ডিলিট বা রিপোর্ট দেখতে পারবে না)।' },
                { title: 'স্টাফ অ্যাক্টিভিটি হিস্ট্রি (Activity Log)', desc: 'কোন স্টাফ কখন লগইন করেছে, কে কোন প্রোডাক্ট সেভ করেছে বা বিক্রি করেছে তার শতভাগ স্বচ্ছ হিস্ট্রি।' }
            ]
        },
        {
            id: 'profile',
            title: '১৫. ইউজার প্রোফাইল ও সিকিউরিটি (My Profile & Security)',
            route: '/profile',
            icon: Lock,
            category: 'admin',
            description: 'নিজের প্রোফাইল ইনফরমেশন দেখা, নাম-ফোন আপডেট করা এবং পাসওয়ার্ড পরিবর্তন করা।',
            features: [
                { title: 'প্রোফাইল এডিট', desc: 'নিজের নাম ও ফোন নম্বর এডিট করা।' },
                { title: 'পাসওয়ার্ড পরিবর্তন (Change Password)', desc: 'বর্তমান পাসওয়ার্ড দিয়ে নতুন নিরাপদ পাসওয়ার্ড সেট করা।' }
            ]
        },
        {
            id: 'settings',
            title: '১৬. সিস্টেম সেটিংস ও কনফিগারেশন (Store Settings)',
            route: '/settings',
            icon: Settings,
            category: 'admin',
            description: 'দোকানের নাম, ঠিকানা, প্রিন্টার সাইজ, ট্যাক্স এবং পেমেন্ট মেথড সেট করার পেজ।',
            features: [
                { title: 'বিজনেস প্রোফাইল', desc: 'দোকানের নাম, ঠিকানা, ফোন নম্বর, লোগো এবং মুদ্রা (৳ BDT) সেট করা।' },
                { title: 'রসিদ ও প্রিন্ট সেটিংস', desc: 'থার্মাল পেপার সাইজ (58mm, 80mm, A4), লোগো ও নিচের ধন্যবাদ মেসেজ সেট করা।' },
                { title: 'ভ্যাট ও ট্যাক্স সেটিংস', desc: 'ট্যাক্সের হার (%) এবং ট্যাক্সের ধরণ (Inclusive / Exclusive) সেট করা।' },
                { title: 'পেমেন্ট মেথডস এনাবল', desc: 'বিকাশ, নগদ, রকেট বা ব্যাংক পেমেন্ট বাটন চালু বা বন্ধ রাখা।' },
                { title: 'ক্লাউড সিঙ্ক (Cloud Sync)', desc: 'ইন্টারনেট কানেক্ট হলে অটোমেটিক লোকাল ডেটাবেজের সাথে ক্লাউড সার্ভার সিঙ্ক হওয়া।' }
            ]
        }
    ];

    const filteredDocs = docs.filter(doc => {
        const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              doc.features.some(f => f.title.toLowerCase().includes(searchTerm.toLowerCase()) || f.desc.toLowerCase().includes(searchTerm.toLowerCase()));
        
        if (activeTab === 'all') return matchesSearch;
        return matchesSearch && doc.category === activeTab;
    });

    return (
        <div className={styles.container}>
            
            {/* Header Banner */}
            <div className={styles.headerCard}>
                <div>
                    <h1 className={styles.headerTitle}>QRPOS সহায়তা ও ব্যবহার নির্দেশিকা (Help Center & Manual)</h1>
                    <p className={styles.headerSubtitle}>
                        QRPOS সফটওয়্যারের প্রতিটি পেজ, ফিচার, বাটন এবং অপশন কীভাবে ব্যবহার করবেন তার বিস্তারিত গাইডলাইন।
                    </p>
                </div>
                <div style={{ background: 'var(--surface)', padding: '1rem 1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>System Status</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CheckCircle size={16} /> All Systems Operational
                    </div>
                </div>
            </div>

            {/* Live Search Box */}
            <div className={styles.searchBox}>
                <Search size={20} className={styles.searchIcon} />
                <input 
                    type="text" 
                    className={styles.searchInput}
                    placeholder="যেকোনো বিষয় বা ফিচারের নাম লিখে খুঁজুন (যেমন: সেলস, প্রিন্ট, প্রোডাক্ট, বাকি, স্টাফ, পাসওয়ার্ড)..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Category Filter Tabs */}
            <div className={styles.tabsRow}>
                <button className={`${styles.tabBtn} ${activeTab === 'all' ? styles.activeTab : ''}`} onClick={() => setActiveTab('all')}>
                    <BookOpen size={16} /> সব বিষয় (All)
                </button>
                <button className={`${styles.tabBtn} ${activeTab === 'pos' ? styles.activeTab : ''}`} onClick={() => setActiveTab('pos')}>
                    <ShoppingCart size={16} /> বিক্রয় ও কাউন্টার (POS)
                </button>
                <button className={`${styles.tabBtn} ${activeTab === 'inventory' ? styles.activeTab : ''}`} onClick={() => setActiveTab('inventory')}>
                    <Package size={16} /> পণ্য ও স্টক (Inventory)
                </button>
                <button className={`${styles.tabBtn} ${activeTab === 'purchases' ? styles.activeTab : ''}`} onClick={() => setActiveTab('purchases')}>
                    <Truck size={16} /> ক্রয় ও সাপ্লায়ার (Purchases)
                </button>
                <button className={`${styles.tabBtn} ${activeTab === 'crm' ? styles.activeTab : ''}`} onClick={() => setActiveTab('crm')}>
                    <Users size={16} /> গ্রাহক ও বাকি (Customers)
                </button>
                <button className={`${styles.tabBtn} ${activeTab === 'finance' ? styles.activeTab : ''}`} onClick={() => setActiveTab('finance')}>
                    <FileBarChart size={16} /> খরচ ও রিপোর্ট (Reports)
                </button>
                <button className={`${styles.tabBtn} ${activeTab === 'admin' ? styles.activeTab : ''}`} onClick={() => setActiveTab('admin')}>
                    <Settings size={16} /> স্টাফ ও সেটিংস (Admin)
                </button>
            </div>

            {/* Documentation Content Grid */}
            <div className={styles.docGrid}>
                {filteredDocs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                        <HelpCircle size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
                        <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>কোনো ফলাফল পাওয়া যায়নি</h3>
                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>"{searchTerm}" সম্পর্কিত কোনো নির্দেশিকা খুঁজে পাওয়া যায়নি। অন্য কিছু লিখে খুঁজুন।</p>
                    </div>
                ) : (
                    filteredDocs.map(doc => {
                        const Icon = doc.icon;
                        return (
                            <div key={doc.id} className={styles.docCard}>
                                <div className={styles.docHeader}>
                                    <div className={styles.docIconBadge}>
                                        <Icon size={22} />
                                    </div>
                                    <h2 className={styles.docTitle}>{doc.title}</h2>
                                    <span className={styles.docRoute}>{doc.route}</span>
                                </div>
                                
                                <p className={styles.docDesc}>{doc.description}</p>
                                
                                <div className={styles.featureSectionTitle}>
                                    <ShieldCheck size={16} color="var(--primary)" /> মূল ফিচার ও কার্যপ্রণালী:
                                </div>

                                <ul className={styles.featureList}>
                                    {doc.features.map((feat, idx) => (
                                        <li key={idx} className={styles.featureItem}>
                                            <span className={styles.featureName}>• {feat.title}:</span>
                                            {feat.desc}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Frequently Asked Questions (FAQ) Section */}
            <div className={styles.faqSection}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 1.25rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Info size={22} color="var(--primary)" /> সাধারণত জিজ্ঞাসিত প্রশ্নাবলী (FAQ)
                </h2>

                <div className={styles.faqItem}>
                    <div className={styles.question}>Q1: ইন্টারনেট কানেকশন বন্ধ থাকলে কি সফটওয়্যার ব্যবহার করা যাবে?</div>
                    <p className={styles.answer}>
                        হ্যাঁ, ১০০% ব্যবহার করা যাবে! QRPOS একটি Offline-First গ্রাউন্ডব্রেকিং অ্যাপ। ইন্টারনেট না থাকলেও সমস্ত সেল, প্রোডাক্ট ও স্টক আপনার ডিভাইসের ব্রাউজারে নিরাপদ IndexedDB ডেটাবেজে কাজ করবে। ইন্টারনেট কানেক্ট হওয়ার সাথে সাথে ক্লাউড সার্ভারে অটো সিঙ্ক হয়ে যাবে।
                    </p>
                </div>

                <div className={styles.faqItem}>
                    <div className={styles.question}>Q2: থার্মাল প্রিন্টারে কীভাবে রসিদ প্রিন্ট করবো?</div>
                    <p className={styles.answer}>
                        Settings পেজে গিয়ে আপনার থার্মাল পেপারের সাইজ (যেমন: 58mm বা 80mm) সিলেক্ট করে রাখুন। বিক্রয় শেষে POS পেজ থেকে বা Sales Details পেজের "Reprint Receipt" বাটনে চাপ দিলে আপনার পিসি বা ডিভাইসের সাথে যুক্ত থার্মাল প্রিন্টারে রসিদ প্রিন্ট হবে।
                    </p>
                </div>

                <div className={styles.faqItem}>
                    <div className={styles.question}>Q3: স্টাফ মেম্বারের পাসওয়ার্ড ভুলে গেলে কীভাবে রিসেট করবো?</div>
                    <p className={styles.answer}>
                        অ্যাডমিন বা ওনার অ্যাকাউন্টে গিয়ে HR & Staff পেজে ঢুকুন। ঐ স্টাফ মেম্বারের পাশে Edit বাটনে চেপে নতুন পাসওয়ার্ড বসিয়ে সেভ করলেই তার পাসওয়ার্ড রিসেট হয়ে যাবে।
                    </p>
                </div>

                <div className={styles.faqItem}>
                    <div className={styles.question}>Q4: পণ্য কাস্টমার ফেরত দিলে কীভাবে এন্ট্রি করবো?</div>
                    <p className={styles.answer}>
                        Sales পেজে গিয়ে নির্দিষ্ট ইনভয়েসটির পাশে View (চোখের আইকন) এ চেপে সেলস ডিটেইলসে যান। সেখানে "Return Items" বাটনে চাপ দিয়ে যে পণ্যটি ফেরত এসেছে তা ইনপুট দিন। সাথে সাথে ইনভেন্টরিতে স্টক বেড়ে যাবে এবং বাকি থাকলে বাকি টাকা সমন্বয় হবে।
                    </p>
                </div>
            </div>

            {/* Footer Support Info */}
            <div className={styles.helpFooter}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#10b981', marginBottom: '0.2rem' }}>QRPOS Enterprise Edition v2.0</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>সবসময় অটোমেটিক সিঙ্ক ও অফলাইন ব্যাকআপ সুবিধাসহ সক্রিয় রয়েছে।</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <RefreshCw size={16} color="#10b981" /> Auto Cloud Sync Active
                </div>
            </div>

        </div>
    );
}
