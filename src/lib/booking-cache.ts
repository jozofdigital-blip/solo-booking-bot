// Cache for booking data shared across the application
const bookingCache = new Map<string, { data: any; timestamp: number }>();

// Export function to clear booking cache
export const clearBookingCache = (profileId?: string) => {
  if (profileId) {
    const keysToDelete: string[] = [];
    bookingCache.forEach((_, key) => {
      if (key.includes(profileId)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => bookingCache.delete(key));
  } else {
    bookingCache.clear();
  }
};

export { bookingCache };
