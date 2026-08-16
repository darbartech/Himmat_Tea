"use client";
import { useState, useEffect } from "react";
import { Plus, Search, Mail, Phone, Edit, Trash2, MoreHorizontal, User, MapPin, ShoppingBag, Gift, PlusCircle, MinusCircle } from "lucide-react";
import { api } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";

import { useTranslation } from "@/hooks/useTranslation";
interface ApiResponse<T> {
  success: boolean;
  data?: T;
}

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loyaltyPointsDialog, setLoyaltyPointsDialog] = useState<any>(null);
  const [pointsAction, setPointsAction] = useState<"add" | "redeem">("add");
  const [pointsAmount, setPointsAmount] = useState<number>(0);
  const [pointsReason, setPointsReason] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const { t } = useTranslation();
  
  const loyaltyProgram = {
    tiers: [
      { name: "Bronze", minPoints: 0 },
      { name: "Silver", minPoints: 500 },
      { name: "Gold", minPoints: 1500 },
      { name: "Platinum", minPoints: 3000 }
    ]
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get<ApiResponse<any[]>>('/customers');
      if (response.success && response.data) {
        setCustomers(response.data);
      }
    } catch (e) {
      console.error("Failed to fetch customers:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const getCustomerOrders = (customerId: number) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.orders || [];
  };

  const handleSaveCustomer = async () => {
    if (!newCustomer.name || !newCustomer.email) return;
    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, newCustomer);
      } else {
        await api.post('/customers', newCustomer);
      }
      await fetchCustomers();
      setIsAddDialogOpen(false);
      setEditingCustomer(null);
      setNewCustomer({
        name: "",
        email: "",
        phone: "",
        address: "",
      });
    } catch (e) {
      console.error("Failed to save customer:", e);
    }
  };

  const handleEditCustomer = (customer: any) => {
    setEditingCustomer(customer);
    setNewCustomer({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
    });
    setIsAddDialogOpen(true);
  };

  const handleDeleteCustomer = async (customerId: number) => {
    try {
      await api.delete(`/customers/${customerId}`);
      await fetchCustomers();
    } catch (e) {
      console.error("Failed to delete customer:", e);
    }
  };

  const handleAddLoyaltyPoints = async (customerId: number, points: number) => {
    try {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        await api.put(`/customers/${customerId}`, {
          loyaltyPoints: customer.loyaltyPoints + points
        });
        await fetchCustomers();
      }
      setLoyaltyPointsDialog(null);
    } catch (e) {
      console.error("Failed to add loyalty points:", e);
    }
  };

  const handleRedeemLoyaltyPoints = async (customerId: number, points: number) => {
    try {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        await api.put(`/customers/${customerId}`, {
          loyaltyPoints: customer.loyaltyPoints - points
        });
        await fetchCustomers();
      }
      setLoyaltyPointsDialog(null);
    } catch (e) {
      console.error("Failed to redeem loyalty points:", e);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1c1917]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Customers
          </h1>
          <p className="text-[#78746e] mt-1">{t('dashboard.customers.subtitle')}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#2d5a3d] hover:bg-[#234832] text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCustomer ? "Edit Customer" : "Add New Customer"}</DialogTitle>
              <DialogDescription>
                {editingCustomer ? "Update customer details" : "Add a new customer to your database"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">{t('checkout.fields.fullName')}</Label>
                <Input
                  id="name"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder={t('dashboard.customers.fullNamePlaceholder')}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">{t('dashboard.customers.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  placeholder={t('dashboard.customers.emailPlaceholder')}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">{t('dashboard.customers.phone')}</Label>
                <Input
                  id="phone"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="+91 9876543210"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">{t('dashboard.settings.address')}</Label>
                <Input
                  id="address"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  placeholder="123 Main Street, City"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => {
                setIsAddDialogOpen(false);
                setEditingCustomer(null);
              }}>
                Cancel
              </Button>
              <Button className="bg-[#2d5a3d] hover:bg-[#234832]" onClick={handleSaveCustomer}>
                Save Customer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#2d5a3d]/5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78746e]" />
          <Input
            type="text"
            placeholder={t('dashboard.customers.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11"
          />
        </div>
      </div>

      {/* Customers Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2d5a3d] mx-auto mb-4"></div>
          <p className="text-lg font-medium text-[#1c1917]">{t('dashboard.customers.loading')}</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => {
            // const customerOrders = getCustomerOrders(customer.id);
            return (
              <Card key={customer.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2d5a3d] to-[#0b7c33] flex items-center justify-center">
                      <User className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex gap-2">
                      <Badge className={`
                        ${customer.tier === "Platinum" ? "bg-purple-100 text-purple-700" :
                          customer.tier === "Gold" ? "bg-yellow-100 text-yellow-700" :
                          customer.tier === "Silver" ? "bg-gray-200 text-gray-700" :
                          "bg-amber-100 text-amber-700"}
                      `}>
                        {customer.tier}
                      </Badge>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEditCustomer(customer)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('dashboard.customers.deleteConfirm')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{customer.name}"? This will not delete their orders.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('dashboard.products.cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteCustomer(customer.id)} className="bg-red-600">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <CardTitle className="mt-4 text-xl">{customer.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-sm text-[#78746e]">
                      <Mail className="h-4 w-4" />
                      <span>{customer.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#78746e]">
                      <Phone className="h-4 w-4" />
                      <span>{customer.phone}</span>
                    </div>
                    {customer.address && (
                      <div className="flex items-center gap-2 text-sm text-[#78746e]">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{customer.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-[#f9f7f4] rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Gift className="h-5 w-5 text-[#2d5a3d]" />
                        <span className="font-semibold text-[#1c1917]">{t('account.loyaltyPoints')}</span>
                      </div>
                      <div className="flex gap-1">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setLoyaltyPointsDialog(customer);
                                setPointsAction("add");
                                setPointsAmount(0);
                                setPointsReason("");
                              }}
                            >
                              <PlusCircle className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                        </AlertDialog>
                        {customer.loyaltyPoints > 0 && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setLoyaltyPointsDialog(customer);
                                  setPointsAction("redeem");
                                  setPointsAmount(0);
                                  setPointsReason("");
                                }}
                              >
                                <MinusCircle className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-[#2d5a3d] mt-2">{customer.loyaltyPoints.toLocaleString()}</p>
                    <div className="mt-2">
                      <div className="w-full bg-[#e8f5ed] rounded-full h-2">
                        <div
                          className="bg-[#2d5a3d] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (customer.loyaltyPoints / 2000) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-[#78746e] mt-1">
                        {customer.tier === "Platinum" ? "Platinum tier unlocked!" :
                          `Next tier: ${loyaltyProgram.tiers.find(t => t.minPoints > customer.loyaltyPoints)?.name || "Platinum"}`}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#2d5a3d]/5">
                    <div>
                      <p className="text-xs text-[#78746e] uppercase tracking-wide mb-1">{t('dashboard.nav.orders')}</p>
                      <p className="text-xl font-bold text-[#1c1917] flex items-center gap-1">
                        <ShoppingBag className="h-4 w-4" />
                        {customer.ordersCount}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#78746e] uppercase tracking-wide mb-1">{t('dashboard.customers.totalSpent')}</p>
                      <p className="text-xl font-bold text-[#2d5a3d]">
                        ₹{customer.totalSpent.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="secondary"
                        className="w-full mt-4"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        View Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      {selectedCustomer && (
                        <>
                          <DialogHeader>
                            <DialogTitle className="text-2xl">{selectedCustomer.name}</DialogTitle>
                            <DialogDescription>{t('dashboard.customers.detailHistoryDesc')}</DialogDescription>
                          </DialogHeader>
                          <Tabs defaultValue="info">
                            <TabsList className="w-full grid grid-cols-2">
                              <TabsTrigger value="info">{t('dashboard.customers.information')}</TabsTrigger>
                              <TabsTrigger value="orders">{t('dashboard.customers.orderHistory')}</TabsTrigger>
                            </TabsList>
                            <TabsContent value="info" className="space-y-4 pt-4">
                              <div className="grid gap-3">
                                <div>
                                  <Label>{t('dashboard.customers.email')}</Label>
                                  <p className="text-[#1c1917]">{selectedCustomer.email}</p>
                                </div>
                                <div>
                                  <Label>{t('dashboard.customers.phone')}</Label>
                                  <p className="text-[#1c1917]">{selectedCustomer.phone}</p>
                                </div>
                                <div>
                                  <Label>{t('dashboard.settings.address')}</Label>
                                  <p className="text-[#1c1917]">{selectedCustomer.address}</p>
                                </div>
                              </div>
                            </TabsContent>
                            <TabsContent value="orders" className="space-y-3 pt-4">
                              {getCustomerOrders(selectedCustomer.id).length === 0 ? (
                                <p className="text-[#78746e] text-center py-8">{t('account.noOrdersYet')}</p>
                              ) : (
                                getCustomerOrders(selectedCustomer.id).map((order: any) => (
                                  <div key={order.id} className="p-4 border border-[#2d5a3d]/10 rounded-xl flex items-center justify-between">
                                    <div>
                                      <p className="font-medium text-[#1c1917]">{order.id}</p>
                                      <p className="text-xs text-[#78746e]">{new Date(order.orderDate).toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-semibold text-[#1c1917]">₹{order.grandTotal.toFixed(2)}</p>
                                      <Badge className={order.status === "Delivered" ? "bg-[#e8f5ed] text-[#2d5a3d]" : "bg-[#fef3c7] text-[#92400e]"}>
                                        {order.status}
                                      </Badge>
                                    </div>
                                  </div>
                                ))
                              )}
                            </TabsContent>
                          </Tabs>
                        </>
                      )}
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!loyaltyPointsDialog} onOpenChange={() => setLoyaltyPointsDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pointsAction === "add" ? "Add Loyalty Points" : "Redeem Loyalty Points"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pointsAction === "add"
                ? `Add loyalty points to ${loyaltyPointsDialog?.name}`
                : `Redeem loyalty points from ${loyaltyPointsDialog?.name}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="pointsAmount">{t('dashboard.customers.points')}</Label>
              <Input
                id="pointsAmount"
                type="number"
                min={1}
                max={pointsAction === "redeem" ? loyaltyPointsDialog?.loyaltyPoints : undefined}
                value={pointsAmount}
                onChange={(e) => setPointsAmount(Number(e.target.value))}
                placeholder={t('dashboard.customers.enterPoints')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pointsReason">{t('dashboard.inventory.reason')}</Label>
              <Textarea
                id="pointsReason"
                value={pointsReason}
                onChange={(e) => setPointsReason(e.target.value)}
                placeholder={t('common.enterReason')}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLoyaltyPointsDialog(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={pointsAction === "redeem" ? "bg-red-600" : "bg-[#2d5a3d]"}
              onClick={() => {
                if (!loyaltyPointsDialog || pointsAmount <= 0) return;
                if (pointsAction === "add") {
                  handleAddLoyaltyPoints(loyaltyPointsDialog.id, pointsAmount);
                } else {
                  handleRedeemLoyaltyPoints(loyaltyPointsDialog.id, pointsAmount);
                }
              }}
              disabled={pointsAmount <= 0 || (pointsAction === "redeem" && pointsAmount > (loyaltyPointsDialog?.loyaltyPoints || 0))}
            >
              {pointsAction === "add" ? "Add Points" : "Redeem Points"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
