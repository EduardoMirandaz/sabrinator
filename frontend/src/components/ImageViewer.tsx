import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ImageViewerProps {
  src: string;
  alt: string;
  className?: string;
  showZoom?: boolean;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  src,
  alt,
  className,
  showZoom = true,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <>
      <motion.div
        className={cn(
          'relative overflow-hidden rounded-2xl bg-muted cursor-pointer group',
          className
        )}
        whileHover={{ scale: 1.02 }}
        onClick={() => showZoom && setIsFullscreen(true)}
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover transition-transform duration-300"
          loading="lazy"
        />
        {showZoom && (
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors flex items-center justify-center">
            <ZoomIn className="w-8 h-8 text-card opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/90 flex items-center justify-center p-4"
            onClick={() => setIsFullscreen(false)}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-card hover:bg-card/20"
              onClick={() => setIsFullscreen(false)}
            >
              <X className="w-6 h-6" />
            </Button>
            
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              src={src}
              alt={alt}
              className="max-w-full max-h-full object-contain rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

interface ImageComparisonProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export const ImageComparison: React.FC<ImageComparisonProps> = ({
  beforeSrc,
  afterSrc,
  beforeLabel = 'Before',
  afterLabel = 'After',
  className,
}) => {
  return (
    <div className={cn('grid grid-cols-2 gap-4', className)}>
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground text-center">
          {beforeLabel}
        </p>
        <ImageViewer src={beforeSrc} alt={beforeLabel} className="aspect-video" />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground text-center">
          {afterLabel}
        </p>
        <ImageViewer src={afterSrc} alt={afterLabel} className="aspect-video" />
      </div>
    </div>
  );
};
