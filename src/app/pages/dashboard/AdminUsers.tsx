import { useState, useEffect } from "react";
import { Plus, Search, Mail, Edit, Trash2, User, Shield, Lock } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useTranslation } from "../../../hooks/useTranslation";
import { api } from "../../../lib/api-client";
import { toast } from "sonner";
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
import { Badge } from "../../components/ui/badge";
import { Switch } from "../../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";

export default function AdminUsers() {
  const { currentUser, userType } = useAuth();
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "admin" as "admin" | "superadmin",
    isActive: true,
  });
  const { t } = useTranslation();
  
  // Fetch admin users from API on mount
  const fetchAdminUsers = async () => {
    try {
      const users = await api.get<any[]>('/admin-users');
      setAdminUsers(users);
    } catch (error) {
      console.error('Failed to fetch admin users:', error);
      toast.error('Failed to load admin users');
    }
  };
  
  useEffect(() => {
    fetchAdminUsers();
  }, []);

  const filteredUsers = adminUsers.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveUser = async () => {
    if (!newUser.username || !newUser.email) {
      toast.error("Please fill in username and email");
      return;
    }
    if (!editingUser && !newUser.password) {
      toast.error("Please enter a password for the new user");
      return;
    }
    try {
      if (editingUser) {
        await api.put(`/admin-users/${editingUser.id}`, newUser);
        toast.success("Admin user updated successfully!");
      } else {
        await api.post('/admin-users', newUser);
        toast.success("Admin user created successfully!");
      }
      // Refresh the admin users list
      await fetchAdminUsers();
      setIsAddDialogOpen(false);
      setEditingUser(null);
      setNewUser({
        username: "",
        email: "",
        password: "",
        role: "admin",
        isActive: true,
      });
    } catch (error) {
      console.error('Failed to save admin user:', error);
      toast.error("Failed to save admin user. Please try again.");
    }
  };
  
  const handleDeleteUser = async (id: number) => {
    try {
      await api.delete(`/admin-users/${id}`);
      await fetchAdminUsers();
      toast.success("Admin user deleted successfully!");
    } catch (error) {
      console.error('Failed to delete admin user:', error);
      toast.error("Failed to delete admin user. Please try again.");
    }
  };

  const handleEditUser = (user: any) => {
    const { t } = useTranslation();

    setEditingUser(user);
    setNewUser({
      username: user.username,
      email: user.email,
      password: "",
      role: user.role,
      isActive: user.isActive,
    });
    setIsAddDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1c1917]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Admin Users
          </h1>
          <p className="text-[#78746e] mt-1">{t('dashboard.adminUsers.subtitle')}</p>
        </div>
        {userType === "admin" && (currentUser as any)?.role === "superadmin" && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#2d5a3d] hover:bg-[#244a33] text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add Admin User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingUser ? "Edit Admin User" : "Add New Admin User"}</DialogTitle>
                <DialogDescription>
                  {editingUser ? "Update admin user details" : "Add a new admin user to the system"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="username">{t('dashboard.adminUsers.username')}</Label>
                  <Input
                    id="username"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    placeholder={t('dashboard.adminUsers.usernamePlaceholder')}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">{t('dashboard.customers.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder={t('dashboard.adminUsers.emailPlaceholder')}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">
                    {editingUser ? "New Password (leave blank to keep current)" : "Password"}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder={t('dashboard.adminUsers.passwordPlaceholder')}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">{t('dashboard.adminUsers.role')}</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value: "admin" | "superadmin") => setNewUser({ ...newUser, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('common.selectRole')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">{t('dashboard.adminUsers.admin')}</SelectItem>
                      <SelectItem value="superadmin">{t('dashboard.adminUsers.superAdmin')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="isActive"
                    checked={newUser.isActive}
                    onCheckedChange={(checked) => setNewUser({ ...newUser, isActive: checked })}
                  />
                  <Label htmlFor="isActive">{t('dashboard.adminUsers.accountActive')}</Label>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => {
                  setIsAddDialogOpen(false);
                  setEditingUser(null);
                }}>
                  Cancel
                </Button>
                <Button className="bg-[#2d5a3d] hover:bg-[#244a33]" onClick={handleSaveUser}>
                  {editingUser ? "Update User" : "Add User"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#2d5a3d]/5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78746e]" />
          <Input
            type="text"
            placeholder={t('dashboard.adminUsers.searchAdminUsers')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11"
          />
        </div>
      </div>

      {/* Admin Users Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user) => {
          const isCurrentUser = currentUser?.id === user.id;
          return (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2d5a3d] to-[#0b7c33] flex items-center justify-center">
                    <User className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={user.role === "superadmin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}>
                      {user.role === "superadmin" ? "Super Admin" : t('dashboard.layout.admin')}
                    </Badge>
                    {!user.isActive && (
                      <Badge variant="outline" className="text-red-600 border-red-200">
                        Inactive
                      </Badge>
                    )}
                  </div>
                </div>
                <CardTitle className="mt-4 text-xl">{user.username}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm text-[#78746e]">
                    <Shield className="h-4 w-4" />
                    <span>Role: {user.role}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#78746e]">
                    <Lock className="h-4 w-4" />
                    <span>Created: {new Date(user.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {userType === "admin" && (currentUser as any)?.role === "superadmin" && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEditUser(user)}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      {!isCurrentUser && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('dashboard.adminUsers.deleteAdminUser')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{user.username}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('dashboard.products.cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-red-600">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
