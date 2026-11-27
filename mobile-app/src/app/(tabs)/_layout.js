import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../../context/AuthContext'
import { colors } from '../../theme'

function TabIcon({ name, focused }) {
  if (focused) {
    return (
      <View style={styles.activeIconPill}>
        <Ionicons name={name} size={19} color={colors.primaryDark} />
      </View>
    )
  }
  return (
    <View style={styles.inactiveIconWrap}>
      <Ionicons name={`${name}-outline`} size={22} color={colors.muted} />
    </View>
  )
}

export default function TabsLayout() {
  const { user } = useAuth()
  const insets = useSafeAreaInsets()
  const isStudent = user?.role !== 'administrator'

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarIconStyle: {
          width: 48,
          height: 30,
        },
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64 + (insets.bottom > 0 ? insets.bottom : 8),
          paddingBottom: insets.bottom > 0 ? insets.bottom : 6,
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="grid" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="enrollments"
        options={{
          title: isStudent ? 'My Enrollments' : 'All Enrollments',
          tabBarLabel: 'Enrollments',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="clipboard" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="grades"
        options={{
          title: isStudent ? 'My Grades' : 'Student Grades',
          tabBarLabel: 'Grades',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="school" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="advisor"
        options={{
          title: 'AI Advisor',
          tabBarLabel: 'AI Advisor',
          // Hidden from students because POST /api/ai/at-risk-summary is admin-only (403).
          href: isStudent ? null : '/advisor',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="sparkles" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="recommend"
        options={{
          title: 'Course Recommendation',
          tabBarLabel: 'Recommend',
          // Students only: POST /api/ai/course-recommendations uses the caller's own records.
          href: isStudent ? '/recommend' : null,
          tabBarIcon: ({ focused }) => (
            <TabIcon name="bulb" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'My Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="person" focused={focused} />
          ),
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  activeIconPill: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 14,
    width: 44,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveIconWrap: {
    width: 44,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
