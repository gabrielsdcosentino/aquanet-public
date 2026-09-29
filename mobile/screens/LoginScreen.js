import { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5 } from '@expo/vector-icons';

export default function LoginScreen({ onLoginSuccess, navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const openWebLink = (path) => {
    Linking.openURL(`https://aquanet.app.br${path}`).catch(err => 
      console.error("Erro ao abrir navegador", err)
    );
  };

  const handleGoogleLogin = () => {
    Alert.alert("Aviso", "O login nativo com Google requer configuração de chaves SHA-1 no Google Cloud. Por enquanto, acesse via usuário/senha ou crie uma conta.");
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://aquanet.app.br/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error("Erro de comunicação com o servidor.");
      }

      if (response.ok) {
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));
        onLoginSuccess(data.user);
      } else {
        Alert.alert('Erro', data.error || 'Credenciais inválidas.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', error.message || 'Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Bem-vindo de volta!</Text>
          <Text style={styles.subtitle}>Acesse seu diário e suas comunidades.</Text>
        </View>

        <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin} activeOpacity={0.8}>
          <FontAwesome5 name="google" size={18} color="#dc2626" style={styles.googleIcon} />
          <Text style={styles.googleBtnText}>Continuar com o Google</Text>
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <View style={styles.dividerTextContainer}>
            <Text style={styles.dividerText}>OU</Text>
          </View>
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Usuário</Text>
          <View style={styles.inputContainer}>
            <FontAwesome5 name="user" size={16} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Seu nome de usuário"
              placeholderTextColor="#9ca3af"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.inputWrapper}>
          <View style={styles.passwordHeader}>
            <Text style={styles.label}>Senha</Text>
            {/* O "Esqueceu a senha" ainda abrirá a web até construirmos a Fase 1.4 */}
            <TouchableOpacity onPress={() => openWebLink('/reset_password')}>
              <Text style={styles.forgotText}>Esqueceu?</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputContainer}>
            <FontAwesome5 name="lock" size={16} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <FontAwesome5 name="sign-in-alt" size={16} color="#ffffff" style={styles.submitIcon} />
              <Text style={styles.submitBtnText}>Entrar</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Ainda não tem conta? </Text>
          {/* Nova navegação 100% nativa */}
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerText}>Cadastre-se grátis</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', justifyContent: 'center', padding: 16 },
  card: { backgroundColor: '#ffffff', padding: 32, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5, width: '100%', maxWidth: 400, alignSelf: 'center' },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '900', color: '#2563eb', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: '#6b7280', textAlign: 'center' },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#d1d5db', marginBottom: 24 },
  googleIcon: { marginRight: 12 },
  googleBtnText: { color: '#374151', fontSize: 16, fontWeight: 'bold' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, position: 'relative', justifyContent: 'center' },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerTextContainer: { position: 'absolute', backgroundColor: '#ffffff', paddingHorizontal: 12 },
  dividerText: { color: '#6b7280', fontSize: 14, fontWeight: '600' },
  inputWrapper: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 8, marginLeft: 4 },
  passwordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  forgotText: { fontSize: 12, fontWeight: '600', color: '#2563eb', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: '#111827', fontWeight: '500' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563eb', paddingVertical: 14, borderRadius: 12, shadowColor: '#93c5fd', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 3 },
  submitIcon: { marginRight: 8 },
  submitBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { color: '#6b7280', fontSize: 14 },
  registerText: { color: '#16a34a', fontSize: 14, fontWeight: 'bold' }
});