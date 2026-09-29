import { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

export default function ResetPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetRequest = async () => {
    if (!email) {
      Alert.alert('Erro', 'Por favor, insira o seu e-mail.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://aquanet.app.br/api/reset_request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Verifique seu E-mail', data.message, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Erro', data.error || 'Não foi possível solicitar a redefinição.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Esqueceu a Senha?</Text>
          <Text style={styles.subtitle}>Insira seu email cadastrado para receber o link de redefinição.</Text>
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputContainer}>
            <FontAwesome5 name="at" size={16} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleResetRequest} disabled={loading} activeOpacity={0.8}>
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <FontAwesome5 name="envelope-open-text" size={16} color="#ffffff" style={styles.submitIcon} />
              <Text style={styles.submitBtnText}>Solicitar Redefinição</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.loginText}>Lembrei minha senha! Voltar para Login</Text>
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
  title: { fontSize: 26, fontWeight: '900', color: '#ea580c', marginBottom: 8, letterSpacing: -0.5, textAlign: 'center' }, // text-orange-600
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  inputWrapper: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 8, marginLeft: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: '#111827', fontWeight: '500' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ea580c', paddingVertical: 14, borderRadius: 12, shadowColor: '#fed7aa', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 3 }, // bg-orange-600
  submitIcon: { marginRight: 8 },
  submitBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  loginText: { color: '#2563eb', fontSize: 14, fontWeight: 'bold', textAlign: 'center' }
});