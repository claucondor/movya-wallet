import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

export default function Index() {
  useEffect(() => {
    const redirect = async () => {
      try {
        await SplashScreen.hideAsync();
        router.replace('/login');
      } catch (e) {
        console.warn('SplashScreen error:', e);
      }
    };

    redirect();
  }, []);

  return null;
}