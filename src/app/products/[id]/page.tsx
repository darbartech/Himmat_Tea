import { Metadata } from 'next';
import ProductDetail from '@/app/pages/ProductDetail';
import { Suspense } from 'react';

import { useTranslation } from '../../../context/TranslationContext';
// Product data for metadata
const productsData: Record<
  string,
  {
    id: string;
    name: string;
    description: string;
    images: string[];
    type: string;
    origin: string;
    price: number;
  }
> = {
  "1": {
    id: "1",
    name: "Dragon Well Longjing",
    type: "green",
    origin: "Zhejiang, China",
    price: 1850,
    images: [
      "https://images.unsplash.com/photo-1514733670139-4d87a1941d55?w=800&h=800&fit=crop&q=80"
    ],
    description: "Dragon Well Longjing is one of China's most celebrated green teas, grown in the hills around Hangzhou's West Lake. Its flat, jade-green leaves unfurl in hot water to release a sweet, chestnut-like fragrance with a lingering vegetal freshness.",
  },
  "2": {
    id: "2",
    name: "First Flush Darjeeling",
    type: "black",
    origin: "West Bengal, India",
    price: 2200,
    images: [
      "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800&h=800&fit=crop&q=80"
    ],
    description: "Harvested in the first weeks of spring from Darjeeling's misty gardens, this First Flush tea captures the season's most delicate essence. Light amber in the cup with a muscatel grape character and floral notes.",
  },
  "3": {
    id: "3",
    name: "Himalayan Herbal Blend",
    type: "herbal",
    origin: "Ilam, Nepal",
    price: 1400,
    images: [
      "https://images.unsplash.com/photo-1596344084757-b83f2081da8b?w=800&h=800&fit=crop&q=80"
    ],
    description: "A soothing blend of wild Himalayan herbs, lemongrass, and chamomile from the organic farms of Ilam. Naturally caffeine-free, this herbal infusion calms the mind and warms the spirit.",
  },
  "4": {
    id: "4",
    name: "Wuyi Rock Oolong",
    type: "oolong",
    origin: "Fujian, China",
    price: 2600,
    images: [
      "https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?w=800&h=800&fit=crop&q=80"
    ],
    description: "Grown on the rocky cliffs of the Wuyi Mountains, this exceptional oolong carries a distinctive mineral 'rock rhyme' known as yangyun.",
  },
  "5": {
    id: "5",
    name: "Silver Needle White Tea",
    type: "white",
    origin: "Fujian, China",
    price: 3200,
    images: [
      "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&h=800&fit=crop&q=80"
    ],
    description: "Silver Needle (Bai Hao Yin Zhen) is the most prized white tea in the world, made exclusively from unopened spring buds with their silver-white down still intact.",
  },
  "6": {
    id: "6",
    name: "Nepal Green Ilam",
    type: "green",
    origin: "Ilam, Nepal",
    price: 1200,
    images: [
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=800&fit=crop&q=80"
    ],
    description: "Grown at 1,800 metres above sea level in Nepal's Ilam district, this green tea benefits from cool mountain air and rich volcanic soil.",
  },
  "7": {
    id: "7",
    name: "Assam CTC Breakfast",
    type: "black",
    origin: "Assam, India",
    price: 950,
    images: [
      "https://images.unsplash.com/photo-1593618998160-e34014e67546?w=800&h=800&fit=crop&q=80"
    ],
    description: "A robust, full-bodied breakfast tea from the lush Assam valley. CTC processing creates small, uniform pellets that brew into a malty, strong cup.",
  },
  "8": {
    id: "8",
    name: "Chamomile Calm",
    type: "herbal",
    origin: "Egypt",
    price: 1100,
    images: [
      "https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=800&h=800&fit=crop&q=80"
    ],
    description: "Whole chamomile flowers hand-harvested from the fertile Nile Delta, prized for their large size and intensely apple-like aroma.",
  },
};

// Generate dynamic metadata for product page
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = productsData[id];
  
  if (!product) {
    return {
      title: 'Product Not Found - Himmat Tea',
      description: 'The product you are looking for could not be found.'
    };
  }
  
  return {
    title: `${product.name} - Himmat Tea`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      url: `https://himmattea.com/products/${id}`, // Replace with your actual domain
      siteName: 'Himmat Tea',
      images: [
        {
          url: product.images[0],
          width: 800,
          height: 800,
          alt: product.name
        }
      ],
      locale: 'en_US',
      type: 'website'
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.description,
      images: [product.images[0]]
    }
  };
}

export default function ProductDetailPage() {
  const { t } = useTranslation();

  return (
    <Suspense fallback={<div>{t('productDetail.loading')}</div>}>
      <ProductDetail />
    </Suspense>
  );
}
