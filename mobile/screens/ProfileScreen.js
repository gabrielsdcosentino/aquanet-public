import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen({ user, onLogout }) {
  const handleLogout = async () => {
    await AsyncStorage.removeItem('userData');
    onLogout();
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileCard}>
        {user?.profile_pic ? (
          <Image source={{ uri: user.profile_pic }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>{user?.username?.[0]?.toUpperCase() || 'U'}</Text>
          </View>
        )}
        
        <Text style={styles.username}>u/{user?.username || 'Usuário'}</Text>
        <Text style={styles.email}>{user?.email || 'email@exemplo.com'}</Text>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sair da Conta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', padding: 16 },
  profileCard: { backgroundColor: '#ffffff', width: '100%', maxWidth: 350, padding: 24, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  avatar: { width: 90, height: 90, borderRadius: 45, marginBottom: 16, borderWidth: 2, borderColor: '#2563eb' },
  avatarPlaceholder: { backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 36, fontWeight: 'bold', color: '#64748b' },
  username: { fontSize: 22, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  email: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  logoutButton: { backgroundColor: '#ef4444', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, width: '100%', alignItems: 'center' },
  logoutText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' }
});