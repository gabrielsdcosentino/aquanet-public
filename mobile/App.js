import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';

export default function App() {
  const [status, setStatus] = useState('Pressione o botão para testar');
  const [loading, setLoading] = useState(false);

  // Função que vai até o Flask buscar dados
  const testarAPI = async () => {
    setLoading(true);
    try {
      // Bate no seu backend hospedado no Vercel
      const response = await fetch('https://aquanet.app.br/api/wake_up');
      const data = await response.json();
      
      // Atualiza a tela com o resultado
      setStatus('Resposta do Flask: ' + JSON.stringify(data));
    } catch (error) {
      setStatus('Erro de conexão: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>AquaNet Nativo 🐟</Text>
        <Text style={styles.subtitle}>Testando conexão com o servidor Flask</Text>
        
        <View style={styles.statusBox}>
          {loading ? (
            <ActivityIndicator size="large" color="#2563eb" />
          ) : (
            <Text style={styles.statusText}>{status}</Text>
          )}
        </View>

        <TouchableOpacity 
          style={styles.button} 
          onPress={testarAPI}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Testar API</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Isso substitui o Tailwind. No React Native, o estilo é feito em JavaScript.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc', // slate-50
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 30,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5, // Sombra nativa do Android
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#2563eb', // blue-600
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b', // slate-500
    marginBottom: 30,
    textAlign: 'center',
  },
  statusBox: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a', // slate-900
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2563eb', // blue-600
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  }
});