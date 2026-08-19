'use client';

import { useRef, useState, ChangeEvent } from 'react';
import { Upload, Image as ImageIcon, Loader2, Edit, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

type UploadMode = 'upload' | 'url';

export type UploadedImageData = {
  url: string;
  publicId?: string;
  width?: number;
  height?: number;
  format?: string;
};

interface ImageUploadFieldProps {
  label?: string;
  value: string;
  onChange: (value: string, metadata?: UploadedImageData) => void;
  folder?: string;
  placeholder?: string;
  accept?: string;
  heightClassName?: string;
  id?: string;
  allowMultiple?: boolean;
  onMultipleUploaded?: (items: UploadedImageData[]) => void;
  required?: boolean;
}

export function ImageUploadField({
  label = 'Image',
  value,
  onChange,
  folder = 'himmat-tea',
  placeholder = 'https://...',
  accept = 'image/*',
  heightClassName = 'h-36',
  id,
  allowMultiple = false,
  onMultipleUploaded,
  required = false,
}: ImageUploadFieldProps) {
  const [mode, setMode] = useState<UploadMode>(value ? 'url' : 'upload');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputId = id || `image-upload-${Math.random().toString(36).slice(2, 8)}`;

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error(`"${file.name}" is not a valid image file`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    try {
      setUploading(true);
      const formData = new FormData();
      if (allowMultiple && files.length > 1) {
        files.forEach((f) => formData.append('files', f));
      } else {
        formData.append('file', files[0]);
      }
      formData.append('folder', folder);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || 'Upload failed');
      }

      if (allowMultiple && files.length > 1) {
        const uploaded: UploadedImageData[] = result.data.uploaded || [];
        if (uploaded.length > 0 && onMultipleUploaded) {
          onMultipleUploaded(uploaded);
        } else if (uploaded.length > 0) {
          const first = uploaded[0];
          onChange(first.url, first);
        }
        toast.success(`Uploaded ${uploaded.length} image(s) successfully!`);
      } else {
        const data: UploadedImageData = result.data;
        onChange(data.url, data);
        toast.success('Image uploaded successfully!');
      }
    } catch (err: any) {
      const rawMsg: string = (err?.message || 'Failed to upload image. Please try again.').toString();
      let displayMsg = rawMsg;
      if (rawMsg.toLowerCase().includes('timeout')) {
        displayMsg =
          'Upload timed out. For best results, compress the image (save as WebP, reduce resolution to ~2000px wide, or lower JPEG quality to 75-80%) then try again.';
      } else if (rawMsg.toLowerCase().includes('preset')) {
        displayMsg =
          'Cloudinary upload preset is missing or invalid. The app retried with signed upload, but if this still fails, check your Cloudinary API key and secret.';
      } else if (rawMsg.toLowerCase().includes('size') || rawMsg.toLowerCase().includes('exceeds')) {
        displayMsg = rawMsg;
      }
      toast.error(displayMsg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const clearImage = (e?: React.MouseEvent) => {
    e?.preventDefault?.();
    onChange('');
  };

  return (
    <div className="grid gap-2">
      <Label htmlFor={inputId} className="flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      <Tabs value={mode} onValueChange={(v) => setMode(v as UploadMode)}>
        <TabsList className="mb-2">
          <TabsTrigger value="upload" className="flex items-center gap-1">
            <Upload className="h-3 w-3 mr-1" />
            {allowMultiple ? 'Upload Files' : 'Upload'}
          </TabsTrigger>
          <TabsTrigger value="url" className="flex items-center gap-1">
            <ImageIcon className="h-3 w-3 mr-1" />
            URL
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upload">
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              id={inputId}
              type="file"
              accept={accept}
              multiple={allowMultiple}
              onChange={handleFileUpload}
              className="hidden"
            />
            <label
              htmlFor={inputId}
              className={`flex flex-col items-center justify-center w-full ${heightClassName} border-2 border-dashed rounded-xl cursor-pointer transition-colors
                ${uploading
                  ? 'border-[#2d5a3d]/50 bg-[#2d5a3d]/5'
                  : 'border-[#2d5a3d]/20 bg-[#f9f7f4] hover:bg-[#2d5a3d]/5 hover:border-[#2d5a3d]/40'
                }
              `}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2 text-[#2d5a3d]">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-sm font-medium">Uploading...</p>
                </div>
              ) : value ? (
                <div className="relative w-full h-full rounded-xl overflow-hidden">
                  <img
                    src={value}
                    alt="Preview"
                    className="w-full h-full object-contain p-2"
                  />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        if (fileInputRef.current) fileInputRef.current.click();
                      }}
                      className="p-1.5 rounded-lg bg-white/90 text-[#1c1917] hover:bg-white shadow-sm"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={clearImage}
                      className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 shadow-sm"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-[#78746e]">
                  <div className="w-10 h-10 rounded-full bg-[#2d5a3d]/10 flex items-center justify-center">
                    <Upload className="h-5 w-5 text-[#2d5a3d]" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-[#1c1917]">
                      {allowMultiple ? 'Click to upload images' : 'Click to upload image'}
                    </p>
                    <p className="text-xs text-[#78746e] mt-0.5">
                      PNG, JPG, WebP up to 10MB{allowMultiple ? ' (select multiple)' : ''}
                    </p>
                  </div>
                </div>
              )}
            </label>
          </div>
        </TabsContent>
        <TabsContent value="url">
          <div className="space-y-3">
            <Input
              id={`${inputId}-url`}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
            />
            {value && (
              <div className={`relative w-full ${heightClassName} rounded-xl overflow-hidden border border-[#2d5a3d]/10`}>
                <img
                  src={value}
                  alt="Preview"
                  className="w-full h-full object-contain p-2"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ImageUploadField;
