'use client';

import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Eye, Save } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
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
import { ImageUploadField } from "../../components/ui/image-upload-field";
import Link from "next/link";

import { useTranslation } from "@/hooks/useTranslation";
const categories = ["All", "Brewing", "Origins", "Wellness", "Culture"];

type BlogPost = {
  id: number;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  image: string;
  readTime: string;
  body: any;
  createdAt: string;
  updatedAt: string;
};

// Function to generate slug from title
const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
};

export default function Blog() {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [newPost, setNewPost] = useState({
    slug: "",
    title: "",
    category: "Brewing",
    excerpt: "",
    image: "",
    readTime: "5 min read",
    body: JSON.stringify([{ type: "p", text: "" }]),
  });
  const { t } = useTranslation();

  // Fetch all blog posts
  const fetchBlogPosts = async () => {
    try {
      const res = await fetch("/api/blog");
      const data = await res.json();
      if (data.data) setBlogPosts(data.data);
    } catch (e) {
      console.error("Failed to fetch blog posts", e);
      toast.error("Failed to load blog posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogPosts();
  }, []);

  const filteredPosts = blogPosts.filter((post) => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { t } = useTranslation();

    const title = e.target.value;
    const autoSlug = generateSlug(title);
    setNewPost({ 
      ...newPost, 
      title, 
      slug: editingPost ? newPost.slug : autoSlug 
    });
  };

  const handleSavePost = async () => {
    if (!newPost.title || !newPost.excerpt) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      let body;
      try {
        body = JSON.parse(newPost.body);
      } catch (e) {
        toast.error("Invalid JSON in content");
        return;
      }

      if (editingPost) {
        // Update existing
        const res = await fetch(`/api/blog/${editingPost.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...newPost, body }),
        });
        if (!res.ok) throw new Error("Failed to update blog post");
        toast.success("Blog post updated!");
      } else {
        // Add new
        const finalSlug = newPost.slug || generateSlug(newPost.title);
        const res = await fetch("/api/blog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...newPost, slug: finalSlug, body }),
        });
        if (!res.ok) throw new Error("Failed to create blog post");
        toast.success("Blog post added!");
      }

      await fetchBlogPosts();
      setIsAddDialogOpen(false);
      setEditingPost(null);
      resetForm();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save blog post");
    }
  };

  const resetForm = () => {
    setNewPost({
      slug: "",
      title: "",
      category: "Brewing",
      excerpt: "",
      image: "",
      readTime: "5 min read",
      body: JSON.stringify([{ type: "p", text: "" }]),
    });
  };

  const handleEditPost = (post: BlogPost) => {
    setEditingPost(post);
    setNewPost({
      slug: post.slug,
      title: post.title,
      category: post.category,
      excerpt: post.excerpt,
      image: post.image,
      readTime: post.readTime,
      body: JSON.stringify(post.body),
    });
    setIsAddDialogOpen(true);
  };

  const handleDeletePost = async (id: number) => {
    try {
      const res = await fetch(`/api/blog/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete post");
      toast.success("Blog post deleted!");
      await fetchBlogPosts();
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete blog post");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-[#78746e]">{t('dashboard.blogAdmin.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1c1917]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Blog Posts
          </h1>
          <p className="text-[#78746e] mt-1">{t('dashboard.blog.subtitle')}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#2d5a3d] hover:bg-[#234832] text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>{editingPost ? "Edit Blog Post" : "Add New Blog Post"}</DialogTitle>
              <DialogDescription>
                {editingPost ? "Update your blog post content" : "Create a new blog post for your tea blog"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={newPost.title}
                    onChange={handleTitleChange}
                    placeholder={t('dashboard.blog.enterTitle')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">{t('dashboard.blog.slug')}</Label>
                  <Input
                    id="slug"
                    value={newPost.slug}
                    onChange={(e) => setNewPost({ ...newPost, slug: e.target.value })}
                    placeholder={t('dashboard.blog.enterSlug')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">{t('dashboard.products.category')}</Label>
                  <Select
                    value={newPost.category}
                    onValueChange={(value) => setNewPost({ ...newPost, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('common.selectCategory')} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.slice(1).map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="readTime">{t('dashboard.blog.readTime')}</Label>
                  <Input
                    id="readTime"
                    value={newPost.readTime}
                    onChange={(e) => setNewPost({ ...newPost, readTime: e.target.value })}
                    placeholder="5 min read"
                  />
                </div>
              </div>

              <ImageUploadField
                label="Post Image"
                value={newPost.image}
                onChange={(v) => setNewPost({ ...newPost, image: v })}
                folder="blog"
                placeholder={t('dashboard.blogAdmin.imageUrlPlaceholder')}
                id="blog-image"
              />

              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt *</Label>
                <Textarea
                  id="excerpt"
                  value={newPost.excerpt}
                  onChange={(e) => setNewPost({ ...newPost, excerpt: e.target.value })}
                  placeholder={t('dashboard.blog.enterExcerpt')}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">{t('dashboard.blog.contentJSON')}</Label>
                <Textarea
                  id="body"
                  value={newPost.body}
                  onChange={(e) => setNewPost({ ...newPost, body: e.target.value })}
                  placeholder={`[{"type": "h2", "text": "Heading"}, {"type": "p", "text": "Paragraph"}]`}
                  rows={10}
                />
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <Button variant="secondary" onClick={() => {
                setIsAddDialogOpen(false);
                setEditingPost(null);
                resetForm();
              }} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button className="bg-[#2d5a3d] hover:bg-[#234832] w-full sm:w-auto" onClick={handleSavePost}>
                <Save className="h-4 w-4 mr-2" />
                Save Post
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#2d5a3d]/5 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78746e]" />
          <Input
            type="text"
            placeholder={t('dashboard.blog.searchPosts')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11"
          />
        </div>
        <Select
          value={selectedCategory}
          onValueChange={setSelectedCategory}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder={t('dashboard.products.allCategories')} />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Posts Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPosts.map((post) => (
          <div key={post.id} className="bg-white rounded-2xl border border-[#2d5a3d]/5 overflow-hidden hover:shadow-md transition-all">
            <div className="h-48 overflow-hidden">
              {post.image ? (
                <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#2d5a3d] to-[#0b7c33] flex items-center justify-center text-white">
                  <span className="text-5xl">🍵</span>
                </div>
              )}
            </div>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 bg-[#f0ede8] text-[#2d5a3d] text-xs font-semibold rounded-full uppercase tracking-wide">
                  {post.category}
                </span>
                <span className="text-xs text-[#78746e]">{formatDate(post.createdAt)}</span>
              </div>
              <h3 className="text-xl font-semibold text-[#1c1917] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                {post.title}
              </h3>
              <p className="text-[#78746e] text-sm mb-4 line-clamp-2">{post.excerpt}</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleEditPost(post)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Link
                  href={`/blog/${post.slug}`}
                  className="px-3 py-1.5 text-sm rounded-lg border border-[#2d5a3d]/10 text-[#78746e] hover:bg-[#f0f9f4] hover:text-[#1c1917] transition-colors"
                >
                  <Eye className="h-4 w-4 mr-1 inline" />
                  View
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('dashboard.blog.deletePost')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{post.title}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('dashboard.products.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeletePost(post.id)} className="bg-red-600">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        ))}
        {filteredPosts.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-[#78746e]">{t('dashboard.blogAdmin.noneFound')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
