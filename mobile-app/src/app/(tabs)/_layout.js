import { Tabs } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { useAuth } from '../../context/AuthContext'
import { colors } from '../../theme'

// Letter icons keep the bundle free of an icon font; swap for real icons later if wanted.
function LetterIcon({ letter, color }) {
  return (
    <View style={[styles.icon, { borderColor: color }]}>
      <Text style={[styles.letter, { color }]}>{letter}</Text>
    </View>
  )
}

const icon = (letter) => function TabIcon({ color }) {
  return <LetterIcon letter={letter} color={color} />
}

export default function TabsLayout() {
  const { user } = useAuth()
  const isStudent = user?.role !== 'administrator'
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerTitleStyle: { color: colors.text },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Courses', tabBarIcon: icon('C') }} />
      <Tabs.Screen
        name="enrollments"
        options={{ title: isStudent ? 'My enrollments' : 'Enrollments', tabBarLabel: 'Enrollments', tabBarIcon: icon('E') }}
      />
      <Tabs.Screen
        name="grades"
        options={{ title: isStudent ? 'My grades' : 'Grades', tabBarLabel: 'Grades', tabBarIcon: icon('G') }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('P') }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  icon: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  letter: { fontSize: 12, fontWeight: '700' },
})
