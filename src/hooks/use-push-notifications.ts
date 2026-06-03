import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useAuth } from './use-auth';
import api from '../services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(
    undefined
  );
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const { isAuthenticated, token, username } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    registerForPushNotificationsAsync()
      .then(async (pushToken) => {
        if (pushToken) {
          setExpoPushToken(pushToken);
          // Send the token to the backend
          api.post('/api/users.php', {
            action: 'update_push_token',
            push_token: pushToken
          }).catch(console.error);

          if (username) {
            // First schedule meal reminders (this clears old notifications)
            await scheduleMealReminders(username);
            // Then schedule demo notification so it doesn't get cancelled
            await scheduleDemoNotification(username);
          }
        }
      })
      .catch((error: any) => setExpoPushToken(`${error}`));

    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification tapped:', response);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [isAuthenticated, token, username]);

  return {
    expoPushToken,
    notification,
  };
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    // Learn more about projectId:
    // https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    
    if (!projectId) {
      throw new Error('Project ID not found');
    }
    
    try {
      const pushTokenString = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
      console.log(pushTokenString);
      return pushTokenString;
    } catch (e: unknown) {
      throw new Error(`${e}`);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }
}

async function scheduleMealReminders(username: string) {
  // Clear any existing scheduled notifications to avoid duplicates
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Schedule afternoon reminder at 15:00 (3 PM)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Meal Reminder',
      body: `Good afternoon ${username}, Do not forgot to update the meal. thank you.`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 15,
      minute: 0,
    },
  });

  // Schedule night reminder at 23:00 (11 PM)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Meal Reminder',
      body: `Good night ${username}, Do not forgot to update the meal. thank you.`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 23,
      minute: 0,
    },
  });
}

let sessionDemoSent = false;

async function scheduleDemoNotification(username: string) {
  // Only send once per app session (not per render cycle)
  if (sessionDemoSent) {
    return;
  }
  sessionDemoSent = true;

  // Schedule a test notification 3 seconds from now to confirm the service works
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '✅ Notifications Active',
      body: `Hello ${username}, your push notification service is working perfectly!`,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3,
      repeats: false,
    },
  });

  console.log('[Demo Notification] Scheduled to fire in 3 seconds');
}


// ALTER TABLE users ADD COLUMN push_token VARCHAR(255) DEFAULT NULL;
