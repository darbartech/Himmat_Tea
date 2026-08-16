'use client';

import React, { useState, useEffect } from "react";
import { api, ApiError } from "../../../lib/api-client";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Star, Trash2, CheckCircle2, XCircle, MoreHorizontal, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { toast } from "sonner";

import { useTranslation } from '../../../context/TranslationContext';
type Review = {
  id: number;
  productId: number;
  rating: number;
  title?: string;
  comment: string;
  approved?: boolean;
  status?: "Approved" | "Pending" | "Rejected";
  createdAt?: string;
  updatedAt?: string;
  product?: { id: number; name: string };
  customer?: { id?: number; name?: string; email?: string };
  customerName?: string;
  name?: string;
  date?: string;
};

const Reviews = () => {
  const { t } = useTranslation();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [filter, setFilter] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<Review[]>("/reviews");
      const data: Review[] = Array.isArray(res) ? res : (res as any)?.data ?? [];
      setReviews(data);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || "Failed to load reviews";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const getStatus = (r: Review): "Approved" | "Pending" | "Rejected" => {
    if (r.status) return r.status;
    if (r.approved === true) return "Approved";
    if (r.approved === false) return "Rejected";
    return "Pending";
  };

  const getReviewerName = (r: Review): string => {
    if (r.customerName) return r.customerName;
    if (r.name) return r.name;
    if (r.customer?.name) return r.customer.name;
    return "Anonymous";
  };

  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const getProductName = (r: Review): string => {
    if (r.product?.name) return r.product.name;
    return `Product #${r.productId}`;
  };

  const getDate = (r: Review): string => {
    if (r.date) return r.date;
    if (r.createdAt) {
      try {
        return new Date(r.createdAt).toLocaleDateString();
      } catch {
        return r.createdAt;
      }
    }
    return "N/A";
  };

  const filteredReviews = filter === "All"
    ? reviews
    : reviews.filter((r) => getStatus(r) === filter);

  const updateReviewStatus = async (review: Review, newStatus: "Approved" | "Rejected") => {
    try {
      setUpdatingId(review.id);
      const updated = await api.put<Review>(`/reviews/${review.id}`, {
        status: newStatus,
        approved: newStatus === "Approved",
      });
      const resolved: Review = (updated as any)?.data ?? updated;
      setReviews((prev) => prev.map((r) => (r.id === resolved.id ? { ...r, ...resolved } : r)));
      toast.success(`Review ${newStatus.toLowerCase()} successfully!`);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || `Failed to ${newStatus.toLowerCase()} review`;
      toast.error(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const requestDelete = (review: Review) => {
    setDeleteTarget(review);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeletingId(deleteTarget.id);
      await api.delete(`/reviews/${deleteTarget.id}`);
      setReviews((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      toast.success("Review deleted successfully!");
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || "Failed to delete review";
      toast.error(msg);
    } finally {
      setDeletingId(null);
      setIsDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{t('dashboard.reviews.approved')}</Badge>;
      case t('dashboard.reviews.pending'):
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{t('dashboard.orders.pending')}</Badge>;
      case "Rejected":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{t('dashboard.reviews.rejected')}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
      />
    ));
  };

  const counts = {
    Pending: reviews.filter((r) => getStatus(r) === t('dashboard.reviews.pending')).length,
    Approved: reviews.filter((r) => getStatus(r) === "Approved").length,
    Rejected: reviews.filter((r) => getStatus(r) === "Rejected").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1c1917]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Reviews
          </h1>
          <p className="text-[#78746e] mt-1">{t('dashboard.reviews.subtitle')}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {["All", t('dashboard.reviews.pending'), "Approved", "Rejected"].map((status) => (
          <Button
            key={status}
            variant={filter === status ? "primary" : "ghost"}
            onClick={() => setFilter(status as any)}
            className={filter === status ? "bg-[#2d5a3d] hover:bg-[#234832]" : "text-[#78746e] hover:bg-[#f9f7f4]"}
          >
            {status}
            {status !== "All" && (
              <span className="ml-2">
                ({counts[status as keyof typeof counts]})
              </span>
            )}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          <Card>
            <CardContent className="pt-6 text-center text-[#78746e]">
              <Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />
              Loading reviews...
            </CardContent>
          </Card>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="grid gap-4">
          <Card>
            <CardContent className="pt-6 text-center text-[#78746e]">
              <p>{t('dashboard.reviews.noReviewsFound')}</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredReviews.map((review) => {
            const status = getStatus(review);
            const reviewerName = getReviewerName(review);
            const initials = getInitials(reviewerName);
            const productName = getProductName(review);
            const date = getDate(review);
            const isBusy = updatingId === review.id || deletingId === review.id;
            return (
              <Card key={review.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2d5a3d] to-[#0b7c33] flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {initials || "??"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-[#1c1917] truncate">{reviewerName}</h3>
                            {getStatusBadge(status)}
                          </div>
                          <p className="text-sm text-[#78746e] truncate">
                            {productName} • {date}
                          </p>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isBusy}
                          className="flex-shrink-0"
                        >
                          {updatingId === review.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {status !== "Approved" && (
                          <DropdownMenuItem
                            onClick={() => updateReviewStatus(review, "Approved")}
                            disabled={isBusy}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                            Approve
                          </DropdownMenuItem>
                        )}
                        {status !== "Rejected" && (
                          <DropdownMenuItem
                            onClick={() => updateReviewStatus(review, "Rejected")}
                            disabled={isBusy}
                          >
                            <XCircle className="mr-2 h-4 w-4 text-red-600" />
                            Reject
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => requestDelete(review)}
                          disabled={isBusy}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    {renderStars(review.rating)}
                    <span className="text-sm text-[#78746e]">{review.rating}/5</span>
                  </div>
                  {review.title && (
                    <h4 className="font-medium text-[#1c1917] mb-1">{review.title}</h4>
                  )}
                  <p className="text-[#1c1917] whitespace-pre-wrap break-words">{review.comment}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboard.reviews.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this review from{" "}
              <span className="font-semibold text-[#1c1917]">
                {deleteTarget ? getReviewerName(deleteTarget) : "this reviewer"}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId !== null}>{t('dashboard.products.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingId !== null}
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingId !== null ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Reviews;
