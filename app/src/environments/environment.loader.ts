import { environment as devEnvironment } from './environment';
import { environment as prodEnvironment } from './environment.prod';

// Function to check if we're in production
function isProduction(): boolean {
  // Check if we're running on Firebase Hosting
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Add your production domain(s) here
    return hostname === 'novels-ai.com';
  }
  return false;
}

// Export the appropriate environment
export const environment = isProduction() ? prodEnvironment : devEnvironment;
