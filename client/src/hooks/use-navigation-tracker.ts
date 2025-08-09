import { useEffect } from 'react';
import { useLocation } from 'wouter';

export const useNavigationTracker = () => {
  const [location] = useLocation();

  useEffect(() => {
    // Save current location when it changes, except for profile page
    if (location !== '/profile') {
      sessionStorage.setItem('previousPage', location);
    }
  }, [location]);

  const getPreviousPage = (): string => {
    const previousPage = sessionStorage.getItem('previousPage');
    const referrer = document.referrer;
    
    // Check if we have a valid previous page stored
    if (previousPage && previousPage !== '/profile' && previousPage !== location) {
      return previousPage;
    } 
    // Check if referrer is from the same origin and not the profile page
    else if (referrer && 
             referrer.includes(window.location.origin) && 
             !referrer.includes('/profile')) {
      try {
        const referrerPath = new URL(referrer).pathname;
        return referrerPath;
      } catch {
        return '/dashboard';
      }
    }
    // Fallback to dashboard
    else {
      return '/dashboard';
    }
  };

  return { getPreviousPage };
};