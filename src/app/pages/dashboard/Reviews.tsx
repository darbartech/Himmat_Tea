import React, { useState } from "react";
import { useStore } from "../../../context/StoreContext";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Star, Trash2, CheckCircle2, XCircle, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../components/ui/dropdown-menu";

const Reviews = () => {
  const { reviews, products, updateReview, deleteReview } = useStore();
  const [filter, setFilter] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");

  const filteredReviews = filter === "All" 
    ? reviews 
    : reviews.filter(r => r.status === filter);

  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product?.name || "Unknown Product";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "Pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "Rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1c1917]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Reviews
          </h1>
          <p className="text-[#78746e]">Manage customer reviews and feedback</p>
        </div>
      </div>

      <div className="flex gap-2">
        {["All", "Pending", "Approved", "Rejected"].map((status) => (
          <Button
            key={status}
            variant={filter === status ? "primary" : "ghost"}
            onClick={() => setFilter(status as any)}
            className={filter === status ? "bg-[#2d5a3d] hover:bg-[#0b7c33]" : "text-[#78746e]"}
          >
            {status}
            {status !== "All" && (
              <span className="ml-2">
                ({reviews.filter(r => r.status === status).length})
              </span>
            )}
          </Button>
        ))}
      </div>

      <div className="grid gap-4">
        {filteredReviews.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-[#78746e]">
              <p>No reviews found</p>
            </CardContent>
          </Card>
        ) : (
          filteredReviews.map((review) => (
            <Card key={review.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2d5a3d] to-[#0b7c33] flex items-center justify-center text-white font-semibold">
                        {review.initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-[#1c1917]">{review.name}</h3>
                          {getStatusBadge(review.status)}
                        </div>
                        <p className="text-sm text-[#78746e]">
                          {getProductName(review.productId)} • {review.date}
                        </p>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {review.status !== "Approved" && (
                        <DropdownMenuItem
                          onClick={() => updateReview(review.id, { status: "Approved" })}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                          Approve
                        </DropdownMenuItem>
                      )}
                      {review.status !== "Rejected" && (
                        <DropdownMenuItem
                          onClick={() => updateReview(review.id, { status: "Rejected" })}
                        >
                          <XCircle className="mr-2 h-4 w-4 text-red-600" />
                          Reject
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => deleteReview(review.id)}
                        className="text-red-600"
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
                <p className="text-[#1c1917]">{review.comment}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Reviews;
