import { useEffect } from 'react';

export function useFavicon(href: string) {
  useEffect(() => {
    const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/svg+xml';
    link.rel = 'icon';
    // Remove leading slash to prevent double slash since BASE_URL includes trailing slash
    const cleanHref = href.startsWith('/') ? href.slice(1) : href;
    // Prefix with BASE_URL if it's not an external HTTP link
    link.href = href.startsWith('http') ? href : `${import.meta.env.BASE_URL}${cleanHref}`;
    document.getElementsByTagName('head')[0].appendChild(link);

    // Cleanup isn't strictly necessary if every page sets its own favicon,
    // but good practice might be to revert to default on unmount. 
    // For this simple case, we'll just let the next component overwrite it.
  }, [href]);
}
