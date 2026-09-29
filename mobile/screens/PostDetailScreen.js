import { useState } from 'react';
import { StyleSheet, Text, View, Image, SafeAreaView, ScrollView, TouchableOpacity, Modal, Linking } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

export default function PostDetailScreen({ route, navigation }) {
  const [post, setPost] = useState(route.params.post);
  const [isModalVisible, setModalVisible] = useState(false);

  const isVideo = (url) => {
    if (!url) return false;
    return url.toLowerCase().match(/\.(mp4|mov|webm)$/) || url.toLowerCase().includes('/video/');
  };

  const handleLike = async () => {
    const isLiked = post.userLiked;
    setPost(prev => ({ ...prev, likes: isLiked ? prev.likes - 1 : prev.likes + 1, userLiked: !isLiked }));

    try {
      const response = await fetch(`https://aquanet.app.br/api/like_post/${post.id}`, {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      const data = await response.json();
      
      if (data.success) {
        setPost(prev => ({ ...prev, likes: data.like_count, userLiked: data.liked }));
      }
    } catch (error) {
      console.error("Erro ao curtir:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1c1c1c" />
        </TouchableOpacity>
        <Text style={styles.topbarTitle}>Publicação</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <Image source={{ uri: post.author_pic }} style={styles.avatar} />
            <View style={styles.headerTextContainer}>
              <Text style={styles.communityText}>c/{post.community}</Text>
              <Text style={styles.authorText}>u/{post.author} • {post.timestamp}</Text>
            </View>
            <TouchableOpacity style={styles.moreButton}>
              <Ionicons name="ellipsis-horizontal" size={20} color="#737373" />
            </TouchableOpacity>
          </View>

          <Text style={styles.content}>{post.content}</Text>

          {post.media && post.media.length > 0 && (
            isVideo(post.media[0]) ? (
              <TouchableOpacity activeOpacity={0.8} style={styles.videoPlaceholder} onPress={() => Linking.openURL(post.media[0])}>
                <Ionicons name="play-circle" size={60} color="#ffffff" />
                <Text style={styles.videoText}>Assistir Vídeo</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity activeOpacity={0.9} onPress={() => setModalVisible(true)} style={styles.mediaContainer}>
                {/* Imagem nunca mais vai distorcer */}
                <Image source={{ uri: post.media[0] }} style={styles.mediaImage} resizeMode="contain" />
              </TouchableOpacity>
            )
          )}

          <View style={styles.postFooter}>
            <View style={styles.pillsContainer}>
              {/* Botão de Curtir com o Joia Exato do Site */}
              <TouchableOpacity 
                style={[styles.actionPill, post.userLiked && { backgroundColor: '#eff6ff' }]} 
                onPress={handleLike}
              >
                <FontAwesome5 
                  name="thumbs-up" 
                  solid={post.userLiked} 
                  size={16} 
                  color={post.userLiked ? "#2563eb" : "#737373"} 
                />
                <Text style={[styles.actionText, post.userLiked && { color: '#2563eb', fontWeight: 'bold' }]}>
                  {post.likes || 'Curtir'}
                </Text>
              </TouchableOpacity>
              
              <View style={styles.actionPill}>
                <Ionicons name="chatbubble-outline" size={18} color="#737373" />
                <Text style={styles.actionText}>{post.comments} Comentários</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Área de Comentários */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>Comentários</Text>
          <Text style={styles.commentsPlaceholder}>
            Os comentários estão bloqueados até finalizarmos a rota JSON no Vercel.
          </Text>
        </View>
      </ScrollView>

      {/* MODAL DE TELA CHEIA PARA IMAGEM */}
      {post.media && post.media.length > 0 && !isVideo(post.media[0]) && (
        <Modal visible={isModalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalBackground}>
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={32} color="#ffffff" />
            </TouchableOpacity>
            <Image source={{ uri: post.media[0] }} style={styles.fullScreenImage} resizeMode="contain" />
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e5e7eb' },
  topbar: { flexDirection: 'row', backgroundColor: '#ffffff', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', alignItems: 'center', justifyContent: 'space-between', paddingTop: 40 },
  topbarTitle: { fontSize: 18, fontWeight: 'bold', color: '#1c1c1c' },
  backButton: { padding: 4 },
  scrollContent: { paddingBottom: 20 },
  
  postCard: { backgroundColor: '#ffffff', paddingTop: 16, paddingBottom: 8 },
  postHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#f1f5f9' },
  headerTextContainer: { flex: 1, justifyContent: 'center' },
  communityText: { fontSize: 15, fontWeight: 'bold', color: '#1c1c1c', marginBottom: 2 },
  authorText: { fontSize: 13, color: '#737373' },
  moreButton: { padding: 4 },
  
  content: { fontSize: 16, color: '#1c1c1c', lineHeight: 24, paddingHorizontal: 16, marginBottom: 16 },
  
  mediaContainer: { width: '100%', height: 350, backgroundColor: '#0f172a' },
  mediaImage: { width: '100%', height: '100%' },
  
  videoPlaceholder: { width: '100%', height: 350, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  videoText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14, marginTop: 8 },
  
  postFooter: { flexDirection: 'row', paddingTop: 16, paddingHorizontal: 16 },
  pillsContainer: { flexDirection: 'row', alignItems: 'center' },
  
  actionPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f2f2f2', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 12 },
  actionText: { fontSize: 14, color: '#737373', fontWeight: '600', marginLeft: 6 },
  
  commentsSection: { marginTop: 8, backgroundColor: '#ffffff', padding: 16, minHeight: 300 },
  commentsTitle: { fontSize: 18, fontWeight: 'bold', color: '#1c1c1c', marginBottom: 12 },
  commentsPlaceholder: { color: '#737373', fontStyle: 'italic', fontSize: 14, lineHeight: 20 },

  modalBackground: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)', justifyContent: 'center', alignItems: 'center' },
  closeModalBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 },
  fullScreenImage: { width: '100%', height: '100%' }
});