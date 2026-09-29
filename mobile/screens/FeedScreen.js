import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, Image, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // Importação nova que resolve o aviso amarelo

export default function FeedScreen() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    try {
      const response = await fetch('https://aquanet.app.br/api/feed');
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error("Erro ao buscar o feed:", error);
    } finally {
      setLoading(false);
    }
  };

  const isVideo = (url) => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('.mp4') || lowerUrl.includes('.mov') || lowerUrl.includes('.webm') || lowerUrl.includes('/video/');
  };

  const handleOpenVideo = (url) => {
    Linking.openURL(url).catch(err => console.error("Não foi possível abrir o vídeo", err));
  };

  const renderPost = ({ item }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <Image source={{ uri: item.author_pic }} style={styles.avatar} />
        <View>
          <Text style={styles.headerText}>
            <Text style={styles.author}>u/{item.author}</Text>
            <Text style={styles.community}> • c/{item.community}</Text>
          </Text>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>
      </View>

      <Text style={styles.content}>{item.content}</Text>

      {item.media && item.media.length > 0 && (
        isVideo(item.media[0]) ? (
          <TouchableOpacity 
            activeOpacity={0.8} 
            style={styles.videoPlaceholder}
            onPress={() => handleOpenVideo(item.media[0])}
          >
            <Text style={styles.playIcon}>▶️</Text>
            <Text style={styles.videoText}>Tocar Vídeo</Text>
          </TouchableOpacity>
        ) : (
          <Image source={{ uri: item.media[0] }} style={styles.mediaImage} />
        )
      )}

      <View style={styles.postFooter}>
        <View style={styles.interactionRow}>
          <Text style={styles.interactionText}>👍 {item.likes}</Text>
        </View>
        <View style={styles.interactionRow}>
          <Text style={styles.interactionText}>💬 {item.comments}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topbar}>
        <Text style={styles.topbarTitle}>AquaNet</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPost}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  topbar: { backgroundColor: '#ffffff', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', alignItems: 'center' },
  topbarTitle: { fontSize: 20, fontWeight: '900', color: '#2563eb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 12 },
  postCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  headerText: { fontSize: 14 },
  author: { fontWeight: 'bold', color: '#0f172a' },
  community: { color: '#2563eb', fontWeight: '600' },
  timestamp: { fontSize: 12, color: '#64748b', marginTop: 2 },
  content: { fontSize: 15, color: '#334155', lineHeight: 22, marginBottom: 12 },
  mediaImage: { width: '100%', height: 250, borderRadius: 8, marginBottom: 12, backgroundColor: '#f8fafc' },
  videoPlaceholder: { width: '100%', height: 200, backgroundColor: '#0f172a', borderRadius: 8, marginBottom: 12, justifyContent: 'center', alignItems: 'center' },
  playIcon: { fontSize: 40, marginBottom: 8 },
  videoText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  postFooter: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  interactionRow: { flexDirection: 'row', alignItems: 'center', marginRight: 24 },
  interactionText: { fontSize: 14, color: '#64748b', fontWeight: '600' }
});