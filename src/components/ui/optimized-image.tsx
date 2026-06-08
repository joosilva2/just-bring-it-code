import { ImgHTMLAttributes } from "react";

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  eager?: boolean;
}

const OptimizedImage = ({ eager, loading, decoding, ...props }: OptimizedImageProps) => (
  <img
    loading={eager ? "eager" : "lazy"}
    decoding="async"
    {...props}
  />
);

export default OptimizedImage;
