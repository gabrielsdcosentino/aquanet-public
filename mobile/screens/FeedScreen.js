import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, Image, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons'; // Trazendo o FontAwesome5 de volta

export default function FeedScreen({ navigation }) {
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
    return url.toLowerCase().match(/\.(mp4|mov|webm)$/) || url.toLowerCase().includes('/video/');
  };

  const handleLike = async (postId) => {
    setPosts(currentPosts => currentPosts.map(p => {
      if (p.id === postId) {
        const isLiked = p.userLiked;
        return { ...p, likes: isLiked ? p.likes - 1 : p.likes + 1, userLiked: !isLiked };
      }
      return p;
    }));

    try {
      const response = await fetch(`https://aquanet.app.br/api/like_post/${postId}`, {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      const data = await response.json();
      
      if (data.success) {
        setPosts(currentPosts => currentPosts.map(p => {
          if (p.id === postId) {
            return { ...p, likes: data.like_count, userLiked: data.liked };
          }
          return p;
        }));
      }
    } catch (error) {
      console.error("Erro ao curtir:", error);
    }
  };

  const renderPost = ({ item }) => (
    <TouchableOpacity 
      activeOpacity={0.9} 
      style={styles.postCard}
      onPress={() => navigation.navigate('PostDetail', { post: item })}
    >
      <View style={styles.postHeader}>
        <Image source={{ uri: item.author_pic }} style={styles.avatar} />
        <View style={styles.headerTextContainer}>
          <Text style={styles.communityText} numberOfLines={1}>c/{item.community}</Text>
          <Text style={styles.authorText} numberOfLines={1}>
            u/{item.author} • {item.timestamp}
          </Text>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#737373" />
        </TouchableOpacity>
      </View>

      <Text style={styles.content}>{item.content}</Text>

      {item.media && item.media.length > 0 && (
        isVideo(item.media[0]) ? (
          <TouchableOpacity activeOpacity={0.8} style={styles.videoPlaceholder} onPress={() => Linking.openURL(item.media[0])}>
            <Ionicons name="play-circle" size={60} color="#ffffff" />
            <Text style={styles.videoText}>Assistir Vídeo</Text>
          </TouchableOpacity>
        ) : (
          {/* resizeMode="contain" garante que a foto nunca será esticada ou cortada */}
          <View style={styles.mediaContainer}>
            <Image source={{ uri: item.media[0] }} style={styles.mediaImage} resizeMode="contain" />
          </View>
        )
      )}

      <View style={styles.postFooter}>
        <View style={styles.pillsContainer}>
          {/* Botão de Curtir com o Joia Exato do Site */}
          <TouchableOpacity 
            style={[styles.actionPill, item.userLiked && { backgroundColor: '#eff6ff' }]} 
            onPress={() => handleLike(item.id)}
          >
            <FontAwesome5 
              name="thumbs-up" 
              solid={item.userLiked} 
              size={16} 
              color={item.userLiked ? "#2563eb" : "#737373"} 
            />
            <Text style={[styles.actionText, item.userLiked && { color: '#2563eb', fontWeight: 'bold' }]}>
              {item.likes || 'Curtir'}
            </Text>
          </TouchableOpacity>

          <View style={styles.actionPill}>
            <Ionicons name="chatbubble-outline" size={18} color="#737373" />
            <Text style={styles.actionText}>{item.comments}</Text>
          </View>
          
          <View style={styles.actionPill}>
            <Ionicons name="arrow-redo-outline" size={20} color="#737373" />
            <Text style={styles.actionText}>Compartilhar</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topbar}>
        <Ionicons name="menu" size={28} color="#1c1c1c" />
        <Text style={styles.topbarTitle}>AquaNet</Text>
        <Ionicons name="search" size={24} color="#1c1c1c" />
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

      <TouchableOpacity 
        style={styles.fab} 
        activeOpacity={0.8}
        onPress={() => Alert.alert("Em breve", "Aqui abrirá a tela de criação!")}
      >
        <Ionicons name="add" size={32} color="#ffffff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e5e7eb' },
  topbar: { flexDirection: 'row', backgroundColor: '#ffffff', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', alignItems: 'center', justifyContent: 'space-between' },
  topbarTitle: { fontSize: 20, fontWeight: '900', color: '#2563eb', letterSpacing: -0.5 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { paddingBottom: 80 },
  
  postCard: { backgroundColor: '#ffffff', marginBottom: 8, paddingTop: 12, paddingBottom: 4 },
  postHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10, backgroundColor: '#f1f5f9' },
  headerTextContainer: { flex: 1, justifyContent: 'center' },
  communityText: { fontSize: 14, fontWeight: 'bold', color: '#1c1c1c', marginBottom: 2 },
  authorText: { fontSize: 12, color: '#737373' },
  moreButton: { padding: 4 },
  
  content: { fontSize: 15, color: '#1c1c1c', lineHeight: 22, paddingHorizontal: 16, marginBottom: 12 },
  
  mediaContainer: { width: '100%', height: 350, backgroundColor: '#0f172a' }, // Fundo escuro para a foto original
  mediaImage: { width: '100%', height: '100%' },
  
  videoPlaceholder: { width: '100%', height: 350, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  videoText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14, marginTop: 8 },
  
  postFooter: { flexDirection: 'row', paddingTop: 12, paddingHorizontal: 12 },
  pillsContainer: { flexDirection: 'row', alignItems: 'center' },
  
  actionPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f2f2f2', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, marginRight: 8 },
  actionText: { fontSize: 13, color: '#737373', fontWeight: '600', marginLeft: 6 },
  
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 }
});