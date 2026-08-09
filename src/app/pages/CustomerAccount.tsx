'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navigation from "@/app/components/Navigation";
import Footer from "@/app/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api-client";
import { 
  LogOut, 
  ShoppingBag, 
  User, 
  MapPin, 
  Mail, 
  Phone,
  Star,
  History,
  Truck,
  CheckCircle2,
  Clock,
  PackageCheck,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface OrderItem {
  id: number;
  productId: number;
  productName?: string;
  name?: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

interface Order {
  id: number | string;
  orderNumber?: string;
  orderDate: string | Date;
  status: string;
  total?: number;
  grandTotal?: number;
  items?: OrderItem[];
  shippingAddress?: string;
  trackingNumber?: string;
  estimatedDeliveryDate?: string | Date;
  customerEmail?: string;
  customerName?: string;
  trackingHistory?: { status: string; date: string; description: string }[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
}

export default function CustomerAccount() {
  const [activeTab, setActiveTab] = useState<'orders' | 'profile'>('orders');
  const { currentUser, userType, logout } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 5;

  useEffect(() => {
    if (!currentUser || userType !== 'customer') {
      router.replace('/customer-auth?redirect=/account');
    }
  }, [currentUser, userType, router]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<ApiResponse<Order[]>>('/orders');
      if (response.success && response.data) {
        setOrders(response.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch orders:', err);
      setError(err.message || 'Failed to load orders. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && userType === 'customer') {
      fetchOrders();
    }
  }, [currentUser, userType]);

  if (!currentUser || userType !== 'customer') {
    return null;
  }

  const customer = currentUser as any;

  const statusColors: Record<string, string> = {
    'Pending': 'bg-yellow-100 text-yellow-800',
    'Processing': 'bg-blue-100 text-blue-800',
    'Shipped': 'bg-purple-100 text-purple-800',
    'Delivered': 'bg-green-100 text-green-800',
    'Cancelled': 'bg-red-100 text-red-800',
    'Refunded': 'bg-gray-100 text-gray-800'
  };

  const trackingSteps = (status: string) => {
    const steps = [
      { id: 1, label: 'Order Placed', status: 'completed', icon: CheckCircle2 },
      { id: 2, label: 'Processing', status: status !== 'Pending' ? 'completed' : 'pending', icon: Clock },
      { id: 3, label: 'Shipped', status: ['Shipped', 'Delivered'].includes(status) ? 'completed' : 'pending', icon: Truck },
      { id: 4, label: 'Delivered', status: status === 'Delivered' ? 'completed' : 'pending', icon: PackageCheck },
    ];
    return steps;
  };

  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = orders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(orders.length / ordersPerPage);

  return (
    <div className="min-h-screen bg-[#f9f7f4]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <Navigation />
      <main className="pt-[180px] pb-24">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-10">
            <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-semibold mb-3">
              My Account
            </p>
            <h1 
              className="text-[clamp(2rem,4vw,3rem)] leading-[1.1] font-semibold text-[#1c1917]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Hello, {customer.name}!
            </h1>
          </div>

          <div className="grid lg:grid-cols-[280px_1fr] gap-10">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] overflow-hidden sticky top-32">
                <div className="p-6 border-b border-[rgba(28,25,23,0.06)]">
                  <div className="w-16 h-16 rounded-full bg-[#2d5a3d] flex items-center justify-center mb-4">
                    <span className="text-2xl font-semibold text-white">
                      {customer.name.charAt(0)}
                    </span>
                  </div>
                  <p className="font-semibold text-[#1c1917]">{customer.name}</p>
                  <p className="text-sm text-[#78746e]">{customer.email}</p>
                  {customer.tier && (
                    <div className="mt-3 inline-flex items-center gap-1 px-3 py-1 bg-[#c8a96e]/10 rounded-full">
                      <Star className="h-3 w-3 text-[#c8a96e]" />
                      <span className="text-xs font-semibold text-[#c8a96e]">
                        {customer.tier} Member
                      </span>
                    </div>
                  )}
                </div>

                <nav className="p-4 space-y-1">
                  <button
                    onClick={() => setActiveTab('orders')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      activeTab === 'orders'
                        ? 'bg-[#2d5a3d] text-white'
                        : 'text-[#78746e] hover:text-[#1c1917] hover:bg-[#f9f7f4]'
                    }`}
                  >
                    <History className="h-4 w-4" />
                    Order History
                  </button>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      activeTab === 'profile'
                        ? 'bg-[#2d5a3d] text-white'
                        : 'text-[#78746e] hover:text-[#1c1917] hover:bg-[#f9f7f4]'
                    }`}
                  >
                    <User className="h-4 w-4" />
                    Profile Details
                  </button>

                  <div className="h-px bg-[rgba(28,25,23,0.06)] my-3" />

                  <button
                    onClick={() => {
                      logout();
                      router.push('/');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-1">
              {/* Orders Tab */}
              {activeTab === 'orders' && (
                <div className="space-y-5">
                  <div className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold text-[#1c1917]" style={{ fontFamily: "'Playfair Display', serif" }}>
                        Order History
                      </h2>
                      <button
                        onClick={fetchOrders}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#2d5a3d] hover:bg-[#2d5a3d]/5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                    </div>

                    {isLoading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2d5a3d] mx-auto mb-4"></div>
                        <p className="text-lg font-medium text-[#1c1917]">Loading your orders...</p>
                      </div>
                    ) : error ? (
                      <div className="text-center py-12">
                        <p className="text-lg font-medium text-red-600 mb-4">{error}</p>
                        <button
                          onClick={fetchOrders}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-[#2d5a3d] text-white font-semibold rounded-xl hover:bg-[#234832] transition-colors"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Try Again
                        </button>
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="text-center py-12">
                        <ShoppingBag className="h-12 w-12 text-[#78746e] mx-auto mb-4" />
                        <p className="text-lg font-medium text-[#1c1917] mb-2">No orders yet</p>
                        <p className="text-sm text-[#78746e] mb-6">Once you place an order, it will show up here.</p>
                        <Link 
                          href="/products"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-[#2d5a3d] text-white font-semibold rounded-xl hover:bg-[#234832] transition-colors"
                        >
                          Shop Now
                        </Link>
                      </div>
                    ) : selectedOrder ? (
                      <div className="space-y-6">
                        <button
                          onClick={() => setSelectedOrder(null)}
                          className="flex items-center gap-2 text-sm font-medium text-[#2d5a3d] hover:underline"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Back to Order History
                        </button>

                        <div className="border border-[rgba(28,25,23,0.08)] rounded-xl overflow-hidden">
                          <div className="p-5 bg-[#f9f7f4] flex items-center justify-between flex-wrap gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[#1c1917]">
                                Order {selectedOrder.orderNumber || selectedOrder.id}
                              </p>
                              <p className="text-xs text-[#78746e]">
                                {new Date(selectedOrder.orderDate).toLocaleDateString('en-IN', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div>
                                <p className="text-xs text-[#78746e]">Total</p>
                                <p className="font-semibold text-[#1c1917]">
                                  Rs. {(selectedOrder.grandTotal || selectedOrder.total || 0).toLocaleString()}
                                </p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[selectedOrder.status] || 'bg-gray-100 text-gray-800'}`}>
                                {selectedOrder.status}
                              </span>
                            </div>
                          </div>

                          <div className="p-5 space-y-6">
                            {/* Order Tracking Timeline */}
                            <div>
                              <h3 className="text-sm font-semibold text-[#1c1917] mb-4">Order Tracking</h3>
                              <div className="relative">
                                <div className="absolute top-5 left-[15px] bottom-5 w-0.5 bg-[rgba(28,25,23,0.1)]"></div>
                                {trackingSteps(selectedOrder.status).map((step, index, arr) => {
                                  const Icon = step.icon;
                                  const isLast = index === arr.length - 1;
                                  return (
                                    <div key={step.id} className="relative flex gap-4 mb-6 last:mb-0">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                                        step.status === 'completed' ? 'bg-[#2d5a3d] text-white' : 'bg-gray-200 text-gray-400'
                                      }`}>
                                        <Icon className="h-4 w-4" />
                                      </div>
                                      <div>
                                        <p className={`text-sm font-medium ${step.status === 'completed' ? 'text-[#1c1917]' : 'text-gray-400'}`}>
                                          {step.label}
                                        </p>
                                        {step.status === 'completed' && (
                                          <p className="text-xs text-[#78746e] mt-1">
                                            {step.id === 1 ? new Date(selectedOrder.orderDate).toLocaleString('en-IN') : 
                                             step.id === 4 ? 'Delivered successfully!' : 'In progress'}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Order Items */}
                            <div>
                              <h3 className="text-sm font-semibold text-[#1c1917] mb-4">Order Items</h3>
                              <div className="space-y-3">
                                {(selectedOrder.items || []).map((item) => (
                                  <div key={item.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-lg bg-[#2d5a3d]/10 flex items-center justify-center shrink-0">
                                        <span className="text-sm font-semibold text-[#2d5a3d]">
                                          {(item.productName || item.name || '').charAt(0)}
                                        </span>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-[#1c1917]">
                                          {item.productName || item.name}
                                        </p>
                                        <p className="text-xs text-[#78746e]">
                                          Qty: {item.quantity} × Rs. {item.price?.toLocaleString()}
                                        </p>
                                      </div>
                                    </div>
                                    <p className="text-sm font-semibold text-[#1c1917]">
                                      Rs. {((item.price || 0) * (item.quantity || 0)).toLocaleString()}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Shipping Address */}
                            {selectedOrder.shippingAddress && (
                              <div className="pt-4 border-t border-[rgba(28,25,23,0.08)]">
                                <p className="text-xs font-semibold text-[#78746e] uppercase tracking-wider mb-2">
                                  Shipping Address
                                </p>
                                <p className="text-sm text-[#1c1917]">
                                  {selectedOrder.shippingAddress}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-5">
                          {currentOrders.map((order) => (
                            <div key={order.id} className="border border-[rgba(28,25,23,0.08)] rounded-xl overflow-hidden">
                              <div className="p-5 bg-[#f9f7f4] flex items-center justify-between flex-wrap gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-[#1c1917]">
                                    Order {order.orderNumber || order.id}
                                  </p>
                                  <p className="text-xs text-[#78746e]">
                                    {new Date(order.orderDate).toLocaleDateString('en-IN', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </p>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div>
                                    <p className="text-xs text-[#78746e]">Total</p>
                                    <p className="font-semibold text-[#1c1917]">
                                      Rs. {(order.grandTotal || order.total || 0).toLocaleString()}
                                    </p>
                                  </div>
                                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>
                                    {order.status}
                                  </span>
                                </div>
                              </div>

                              <div className="p-5">
                                <div className="flex items-center justify-between">
                                  <div className="space-y-3">
                                    {(order.items || []).slice(0, 2).map((item) => (
                                      <div key={item.id} className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-[#2d5a3d]/10 flex items-center justify-center shrink-0">
                                          <span className="text-xs font-semibold text-[#2d5a3d]">
                                            {(item.productName || item.name || '').charAt(0)}
                                          </span>
                                        </div>
                                        <p className="text-sm font-medium text-[#1c1917]">
                                          {item.productName || item.name}
                                        </p>
                                      </div>
                                    ))}
                                    {order.items && order.items.length > 2 && (
                                      <p className="text-xs text-[#78746e]">
                                        +{order.items.length - 2} more items
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => setSelectedOrder(order)}
                                    className="px-4 py-2 text-sm font-medium text-[#2d5a3d] hover:bg-[#2d5a3d]/5 rounded-lg transition-colors"
                                  >
                                    View Details
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                          <div className="flex items-center justify-center gap-2 mt-8 pt-6 border-t border-[rgba(28,25,23,0.08)]">
                            <button
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                              className="w-10 h-10 flex items-center justify-center rounded-lg border border-[rgba(28,25,23,0.1)] text-[#78746e] hover:text-[#1c1917] hover:border-[#2d5a3d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                                  currentPage === page
                                    ? 'bg-[#2d5a3d] text-white'
                                    : 'text-[#78746e] hover:text-[#1c1917] hover:bg-[#f9f7f4]'
                                }`}
                              >
                                {page}
                              </button>
                            ))}
                            <button
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                              disabled={currentPage === totalPages}
                              className="w-10 h-10 flex items-center justify-center rounded-lg border border-[rgba(28,25,23,0.1)] text-[#78746e] hover:text-[#1c1917] hover:border-[#2d5a3d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-8">
                  <h2 className="text-xl font-semibold text-[#1c1917] mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
                    Profile Details
                  </h2>

                  <div className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[#78746e] text-sm">
                          <User className="h-4 w-4" />
                          <span>Full Name</span>
                        </div>
                        <p className="font-semibold text-[#1c1917]">{customer.name}</p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[#78746e] text-sm">
                          <Mail className="h-4 w-4" />
                          <span>Email</span>
                        </div>
                        <p className="font-semibold text-[#1c1917]">{customer.email}</p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[#78746e] text-sm">
                          <Phone className="h-4 w-4" />
                          <span>Phone Number</span>
                        </div>
                        <p className="font-semibold text-[#1c1917]">{customer.phone || 'Not set'}</p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[#78746e] text-sm">
                          <MapPin className="h-4 w-4" />
                          <span>Address</span>
                        </div>
                        <p className="font-semibold text-[#1c1917]">{customer.address || 'Not set'}</p>
                      </div>
                    </div>

                    {customer.loyaltyPoints !== undefined && (
                      <div className="p-5 bg-[#c8a96e]/10 rounded-xl border border-[#c8a96e]/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-[#1c1917]">Loyalty Points</p>
                            <p className="text-3xl font-bold text-[#c8a96e]">{customer.loyaltyPoints}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-[#78746e]">Member Tier</p>
                            <p className="font-semibold text-[#1c1917]">{customer.tier || 'Bronze'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
