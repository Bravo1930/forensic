import { useEffect } from 'react';

interface HeadMetaProps {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  ogUrl?: string;
  canonical?: string;
}

export const HeadMeta = ({
  title,
  description,
  keywords = [],
  ogImage,
  ogUrl,
  canonical,
}: HeadMetaProps) => {
  useEffect(() => {
    // Set title
    document.title = `${title} | Forensic Legal Analyzer`;

    // Set meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = description;
      document.head.appendChild(meta);
    }

    // Set keywords
    if (keywords.length > 0) {
      const metaKeywords = document.querySelector('meta[name="keywords"]');
      if (metaKeywords) {
        metaKeywords.setAttribute('content', keywords.join(', '));
      } else {
        const meta = document.createElement('meta');
        meta.name = 'keywords';
        meta.content = keywords.join(', ');
        document.head.appendChild(meta);
      }
    }

    // Set Open Graph
    if (ogImage || ogUrl) {
      const metaOgImage = document.querySelector('meta[property="og:image"]');
      if (ogImage) {
        if (metaOgImage) {
          metaOgImage.setAttribute('content', ogImage);
        } else {
          const meta = document.createElement('meta');
          meta.setAttribute('property', 'og:image');
          meta.content = ogImage;
          document.head.appendChild(meta);
        }
      }

      const metaOgUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) {
        if (metaOgUrl) {
          metaOgUrl.setAttribute('content', ogUrl);
        } else {
          const meta = document.createElement('meta');
          meta.setAttribute('property', 'og:url');
          meta.content = ogUrl;
          document.head.appendChild(meta);
        }
      }
    }

    // Set canonical URL
    if (canonical) {
      const linkCanonical = document.querySelector('link[rel="canonical"]');
      if (linkCanonical) {
        linkCanonical.setAttribute('href', canonical);
      } else {
        const link = document.createElement('link');
        link.rel = 'canonical';
        link.href = canonical;
        document.head.appendChild(link);
      }
    }
  }, [title, description, keywords, ogImage, ogUrl, canonical]);

  return null;
};
