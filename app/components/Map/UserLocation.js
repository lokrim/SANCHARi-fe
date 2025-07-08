import { useEffect } from "react";

const UserLocation = ({ setUserPosition }) => {
  useEffect(() => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log("User Location:", latitude, longitude);
        setUserPosition([latitude, longitude]);
      },
      (error) => {
        console.error("Geolocation error:", {
          code: error.code,
          message: error.message,
        });

        alert("Location access denied or failed: " + error.message);
      }
    );
  }, []); 

  return null;
};

export default UserLocation;
