'use client';

import { useState, useEffect, useRef, ChangeEvent } from "react";
import { Save, Bell, User, Lock, Globe, Palette, Upload, Image as ImageIcon, CreditCard, Loader2, Edit, X, Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useTranslation } from '../../../context/TranslationContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

type Settings = {
  id?: string;
  taxRate: number;
  shippingFlatRate: number;
  qrImageUrl: string | null;
  currency: string;
  storeName: string;
  storeEmail: string;
  storePhone: string;
  notificationsEnabled: boolean;
  lowStockThreshold: number;
  gstNumber: string | null;
  updatedAt?: string;
  createdAt?: string;
};

export default function Settings() {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingQR, setUploadingQR] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [localSettings, setLocalSettings] = useState<Settings>({
    taxRate: 18,
    shippingFlatRate: 0,
    qrImageUrl: null,
    currency: '₹',
    storeName: 'Himmat Tea',
    storeEmail: 'support@himmattea.com',
    storePhone: '+91 9876543210',
    notificationsEnabled: true,
    lowStockThreshold: 30,
    gstNumber: null,
  });
  const qrFileInputRef = useRef<HTMLInputElement>(null);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.data) {
        setSettings(data.data);
        setLocalSettings({
          taxRate: data.data.taxRate ?? 18,
          shippingFlatRate: data.data.shippingFlatRate ?? 0,
          qrImageUrl: data.data.qrImageUrl ?? null,
          currency: data.data.currency ?? '₹',
          storeName: data.data.storeName ?? 'Himmat Tea',
          storeEmail: data.data.storeEmail ?? 'support@himmattea.com',
          storePhone: data.data.storePhone ?? '+91 9876543210',
          notificationsEnabled: data.data.notificationsEnabled ?? true,
          lowStockThreshold: data.data.lowStockThreshold ?? 30,
          gstNumber: data.data.gstNumber ?? null,
        });
      }
    } catch (e) {
      console.error("Failed to load settings", e);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      fetchSettings();
    });
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localSettings)
      });
      if (!res.ok) throw new Error("Failed to save settings");
      const data = await res.json();
      setSettings(data.data);
      toast.success("Settings saved successfully!");
    } catch (e) {
      console.error("Error saving settings", e);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleQRImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    try {
      setUploadingQR(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "settings");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || "Upload failed");
      }

      setLocalSettings((prev) => ({ ...prev, qrImageUrl: result.data.url }));
      toast.success("QR Image uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image. Please try again.");
    } finally {
      setUploadingQR(false);
      if (qrFileInputRef.current) {
        qrFileInputRef.current.value = "";
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#2d5a3d]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1c1917]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Settings
          </h1>
          <p className="text-[#78746e] mt-1">{t('dashboard.settings.manageDesc')}</p>
        </div>
        <Button className="bg-[#2d5a3d] hover:bg-[#234832]" onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-12">
          <CardContent className="p-0">
            <Tabs defaultValue="general" className="w-full">
              <div className="border-b border-[#2d5a3d]/10">
                <TabsList className="w-full justify-start gap-4 px-4 h-auto bg-transparent border-b-0">
                  <TabsTrigger value="general" className="h-12 border-b-2 border-transparent data-[state=active]:border-[#2d5a3d] data-[state=active]:text-[#2d5a3d] bg-transparent hover:bg-[#f9f7f4]">
                    <User className="h-4 w-4 mr-2" />
                    General
                  </TabsTrigger>
                  <TabsTrigger value="payments" className="h-12 border-b-2 border-transparent data-[state=active]:border-[#2d5a3d] data-[state=active]:text-[#2d5a3d] bg-transparent hover:bg-[#f9f7f4]">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Payments
                  </TabsTrigger>
                  <TabsTrigger value="notifications" className="h-12 border-b-2 border-transparent data-[state=active]:border-[#2d5a3d] data-[state=active]:text-[#2d5a3d] bg-transparent hover:bg-[#f9f7f4]">
                    <Bell className="h-4 w-4 mr-2" />
                    Notifications
                  </TabsTrigger>
                  <TabsTrigger value="localization" className="h-12 border-b-2 border-transparent data-[state=active]:border-[#2d5a3d] data-[state=active]:text-[#2d5a3d] bg-transparent hover:bg-[#f9f7f4]">
                    <Globe className="h-4 w-4 mr-2" />
                    Localization
                  </TabsTrigger>
                  <TabsTrigger value="inventory" className="h-12 border-b-2 border-transparent data-[state=active]:border-[#2d5a3d] data-[state=active]:text-[#2d5a3d] bg-transparent hover:bg-[#f9f7f4]">
                    <Package className="h-4 w-4 mr-2" />
                    Inventory
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                <TabsContent value="general" className="space-y-6 mt-0">
                  <div>
                    <h3 className="text-lg font-semibold text-[#1c1917] mb-4">{t('dashboard.settings.storeInfo')}</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('dashboard.settings.storeName')}</Label>
                        <Input
                          value={localSettings.storeName}
                          onChange={(e) => setLocalSettings({ ...localSettings, storeName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('dashboard.customers.email')}</Label>
                        <Input
                          type="email"
                          value={localSettings.storeEmail}
                          onChange={(e) => setLocalSettings({ ...localSettings, storeEmail: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('dashboard.customers.phone')}</Label>
                        <Input
                          value={localSettings.storePhone}
                          onChange={(e) => setLocalSettings({ ...localSettings, storePhone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('dashboard.settings.gstNumber')}</Label>
                        <Input
                          value={localSettings.gstNumber ?? ""}
                          onChange={(e) => setLocalSettings({ ...localSettings, gstNumber: e.target.value || null })}
                          placeholder={t('dashboard.settings.gstNumberPlaceholder')}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="payments" className="space-y-6 mt-0">
                  <div>
                    <h3 className="text-lg font-semibold text-[#1c1917] mb-4">{t('dashboard.settings.paymentTaxSettings')}</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4 md:col-span-2">
                        <div className="space-y-2">
                          <Label>{t('dashboard.settings.storeInformation.taxRate')}</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            max={100}
                            value={localSettings.taxRate}
                            onChange={(e) => setLocalSettings({ ...localSettings, taxRate: Number(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Shipping Flat Rate (₹)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            value={localSettings.shippingFlatRate}
                            onChange={(e) => setLocalSettings({ ...localSettings, shippingFlatRate: Number(e.target.value) })}
                            placeholder={t('dashboard.settings.flatShippingRatePlaceholder')}
                          />
                        </div>
                      </div>

                      <Card className="md:col-span-2 border-[#2d5a3d]/10">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{t('dashboard.settings.paymentQrCode')}</CardTitle>
                          <CardDescription className="text-sm">
                            Upload a QR code for manual QR-based payments. Customers will see this during checkout.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <input
                              ref={qrFileInputRef}
                              id="qrImageFile"
                              type="file"
                              accept="image/*"
                              onChange={handleQRImageUpload}
                              className="hidden"
                            />
                            <label
                              htmlFor="qrImageFile"
                              className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors
                                ${uploadingQR
                                  ? 'border-[#2d5a3d]/50 bg-[#2d5a3d]/5'
                                  : 'border-[#2d5a3d]/20 bg-[#f9f7f4] hover:bg-[#2d5a3d]/5 hover:border-[#2d5a3d]/40'
                                }
                              `}
                            >
                              {uploadingQR ? (
                                <div className="flex flex-col items-center gap-2 text-[#2d5a3d]">
                                  <Loader2 className="h-8 w-8 animate-spin" />
                                  <p className="text-sm font-medium">{t('common.uploading')}</p>
                                </div>
                              ) : localSettings.qrImageUrl ? (
                                <div className="relative w-full h-full rounded-xl overflow-hidden">
                                  <img
                                    src={localSettings.qrImageUrl}
                                    alt={t('dashboard.settings.paymentQrCode')}
                                    className="w-full h-full object-contain p-4"
                                  />
                                  <div className="absolute top-3 right-3 flex gap-1">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        if (qrFileInputRef.current) qrFileInputRef.current.click();
                                      }}
                                      className="p-2 rounded-lg bg-white/95 text-[#1c1917] hover:bg-white shadow-sm border border-[#2d5a3d]/10"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        setLocalSettings((prev) => ({ ...prev, qrImageUrl: null }));
                                      }}
                                      className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 shadow-sm border border-red-200"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-2 text-[#78746e]">
                                  <div className="w-12 h-12 rounded-full bg-[#2d5a3d]/10 flex items-center justify-center">
                                    <Upload className="h-6 w-6 text-[#2d5a3d]" />
                                  </div>
                                  <div className="text-center">
                                    <p className="text-sm font-medium text-[#1c1917]">
                                      Click to upload QR code
                                    </p>
                                    <p className="text-xs text-[#78746e] mt-0.5">
                                      PNG or JPG (preferably transparent background)
                                    </p>
                                  </div>
                                </div>
                              )}
                            </label>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="notifications" className="space-y-6 mt-0">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-[#1c1917] mb-4">{t('dashboard.notifications')}</h3>
                    <div className="flex items-center justify-between py-3 border-b border-[#2d5a3d]/5 last:border-b-0">
                      <div>
                        <p className="font-medium text-[#1c1917]">{t('dashboard.settings.orderNotifs')}</p>
                        <p className="text-sm text-[#78746e]">{t('dashboard.settings.orderNotificationsDesc')}</p>
                      </div>
                      <Switch
                        checked={localSettings.notificationsEnabled}
                        onCheckedChange={(checked) => setLocalSettings({ ...localSettings, notificationsEnabled: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-[#2d5a3d]/5 last:border-b-0">
                      <div>
                        <p className="font-medium text-[#1c1917]">{t('dashboard.settings.notifications.emailNotifications')}</p>
                        <p className="text-sm text-[#78746e]">{t('dashboard.settings.emailNotificationsDesc')}</p>
                      </div>
                      <Switch
                        checked={true}
                        onCheckedChange={() => {}}
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-[#2d5a3d]/5 last:border-b-0">
                      <div>
                        <p className="font-medium text-[#1c1917]">{t('dashboard.settings.lowStock')}</p>
                        <p className="text-sm text-[#78746e]">{t('dashboard.settings.lowStockAlertsDesc')}</p>
                      </div>
                      <Switch
                        checked={true}
                        onCheckedChange={() => {}}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="localization" className="space-y-6 mt-0">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('dashboard.settings.currency')}</Label>
                      <Select
                        value={localSettings.currency}
                        onValueChange={(value) => setLocalSettings({ ...localSettings, currency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="₹">Indian Rupee (₹)</SelectItem>
                          <SelectItem value="Rs.">{t('dashboard.settings.nepaleseRupee')}</SelectItem>
                          <SelectItem value="$">US Dollar ($)</SelectItem>
                          <SelectItem value="€">Euro (€)</SelectItem>
                          <SelectItem value="£">British Pound (£)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('dashboard.settings.localization.language')}</Label>
                      <Select defaultValue="en">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">{t('dashboard.settings.localization.languages.english')}</SelectItem>
                          <SelectItem value="hi">{t('dashboard.settings.languages.hindi')}</SelectItem>
                          <SelectItem value="ne">{t('dashboard.settings.languages.nepali')}</SelectItem>
                          <SelectItem value="gu">{t('dashboard.settings.languages.gujarati')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('dashboard.settings.localization.timeZone')}</Label>
                      <Select defaultValue="Asia/Kolkata">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asia/Kathmandu">Nepal Standard Time (UTC+5:45)</SelectItem>
                          <SelectItem value="Asia/Kolkata">India Standard Time (UTC+5:30)</SelectItem>
                          <SelectItem value="UTC">{t('dashboard.settings.localization.timeZones.utc')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('dashboard.settings.weightUnit')}</Label>
                      <Select defaultValue="g">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="g">{t('dashboard.settings.units.grams')}</SelectItem>
                          <SelectItem value="kg">{t('dashboard.settings.units.kilograms')}</SelectItem>
                          <SelectItem value="oz">{t('dashboard.settings.units.ounces')}</SelectItem>
                          <SelectItem value="lb">{t('dashboard.settings.units.pounds')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="inventory" className="space-y-6 mt-0">
                  <div>
                    <h3 className="text-lg font-semibold text-[#1c1917] mb-4">{t('dashboard.settings.inventorySettings')}</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('dashboard.settings.lowStockThreshold')}</Label>
                        <Input
                          type="number"
                          min={0}
                          value={localSettings.lowStockThreshold}
                          onChange={(e) => setLocalSettings({ ...localSettings, lowStockThreshold: Number(e.target.value) })}
                          placeholder={t('dashboard.settings.lowStockThresholdPlaceholder')}
                        />
                        <p className="text-xs text-[#78746e]">
                          Products with stock at or below this number will be marked as "Low Stock"
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('dashboard.settings.defaultReorderPoint')}</Label>
                        <Input
                          type="number"
                          min={0}
                          defaultValue={50}
                          placeholder={t('dashboard.settings.defaultReorderPointPlaceholder')}
                        />
                        <p className="text-xs text-[#78746e]">
                          Default reorder point applied to newly created products
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
