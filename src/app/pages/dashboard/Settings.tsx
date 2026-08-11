'use client';

import { useState, useEffect } from "react";
import { Save, Bell, User, Lock, Globe, Palette } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

type Settings = {
  id?: number;
  taxRate: number;
  currency: string;
  storeName: string;
  storeEmail: string;
  storePhone: string;
  notificationsEnabled: boolean;
  lowStockThreshold: number;
};

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [localSettings, setLocalSettings] = useState<Settings>({
    taxRate: 18,
    currency: '₹',
    storeName: 'Himmat Tea',
    storeEmail: 'support@himmattea.com',
    storePhone: '+91 9876543210',
    notificationsEnabled: true,
    lowStockThreshold: 30
  });

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.data) {
        setSettings(data.data);
        setLocalSettings(data.data);
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
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-[#78746e]">Loading settings...</p>
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
          <p className="text-[#78746e] mt-1">Manage your store settings</p>
        </div>
        <Button className="bg-[#2d5a3d] hover:bg-[#234832]" onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
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
                  <TabsTrigger value="notifications" className="h-12 border-b-2 border-transparent data-[state=active]:border-[#2d5a3d] data-[state=active]:text-[#2d5a3d] bg-transparent hover:bg-[#f9f7f4]">
                    <Bell className="h-4 w-4 mr-2" />
                    Notifications
                  </TabsTrigger>
                  <TabsTrigger value="localization" className="h-12 border-b-2 border-transparent data-[state=active]:border-[#2d5a3d] data-[state=active]:text-[#2d5a3d] bg-transparent hover:bg-[#f9f7f4]">
                    <Globe className="h-4 w-4 mr-2" />
                    Localization
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                <TabsContent value="general" className="space-y-6 mt-0">
                  <div>
                    <h3 className="text-lg font-semibold text-[#1c1917] mb-4">Store Information</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Store Name</Label>
                        <Input
                          value={localSettings.storeName}
                          onChange={(e) => setLocalSettings({ ...localSettings, storeName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          value={localSettings.storeEmail}
                          onChange={(e) => setLocalSettings({ ...localSettings, storeEmail: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input
                          value={localSettings.storePhone}
                          onChange={(e) => setLocalSettings({ ...localSettings, storePhone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tax Rate (%)</Label>
                        <Input
                          type="number"
                          value={localSettings.taxRate}
                          onChange={(e) => setLocalSettings({ ...localSettings, taxRate: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Currency</Label>
                        <Select
                          value={localSettings.currency}
                          onValueChange={(value) => setLocalSettings({ ...localSettings, currency: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="₹">Indian Rupee</SelectItem>
                            <SelectItem value="Rs.">Nepalese Rupee</SelectItem>
                            <SelectItem value="$">US Dollar</SelectItem>
                            <SelectItem value="€">Euro</SelectItem>
                            <SelectItem value="£">British Pound</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="notifications" className="space-y-6 mt-0">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-[#1c1917] mb-4">Notifications</h3>
                    <div className="flex items-center justify-between py-3 border-b border-[#2d5a3d]/5 last:border-b-0">
                      <div>
                        <p className="font-medium text-[#1c1917]">Order Notifications</p>
                        <p className="text-sm text-[#78746e]">Get notified when new orders are placed</p>
                      </div>
                      <Switch
                        checked={localSettings.notificationsEnabled}
                        onCheckedChange={(checked) => setLocalSettings({ ...localSettings, notificationsEnabled: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-[#2d5a3d]/5 last:border-b-0">
                      <div>
                        <p className="font-medium text-[#1c1917]">Email Notifications</p>
                        <p className="text-sm text-[#78746e]">Receive email updates</p>
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
                      <Label>Language</Label>
                      <Select defaultValue="en">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="hi">Hindi</SelectItem>
                          <SelectItem value="gu">Gujarati</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Time Zone</Label>
                      <Select defaultValue="Asia/Kolkata">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asia/Kathmandu">Nepal Standard Time</SelectItem>
                          <SelectItem value="Asia/Kolkata">India Standard Time</SelectItem>
                          <SelectItem value="UTC">UTC</SelectItem>
                        </SelectContent>
                      </Select>
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
