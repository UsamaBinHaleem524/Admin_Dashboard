// Utility function to get company profile data
export const getCompanyProfile = async () => {
  try {
    const response = await fetch('/api/company-profile');
    if (response.ok) {
      const data = await response.json();
      return data && Object.keys(data).length > 0 ? data : null;
    }
    return null;
  } catch (error) {
    console.error('Error fetching company profile:', error);
    return null;
  }
};

// Default company profile fallback
export const getDefaultCompanyProfile = () => ({
  name: "Mehran Al Dahabi",
  contact: "CR#: 591644739",
  email: "businessemail@gmail.com",
  address: "Jeddah, Saudi Arabia"
}); 