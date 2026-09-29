import { StyleSheet, Text, View, Image, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';

export default function PostDetailScreen({ route, navigation }) {
  const { post } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabeçalho de Navegação */}
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.topbarTitle}>Publicação</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <Image source={{ uri: post.author_pic }} style={styles.avatar} />
            <View>
              <Text style={styles.headerText}>
                <Text style={styles.author}>u/{post.author}</Text>
                <Text style={styles.community}> • c/{post.community}</Text>
              </Text>
              <Text style={styles.timestamp}>{post.timestamp}</Text>
            </View>
          </View>

          <Text style={styles.content}>{post.content}</Text>

          {post.media && post.media.length > 0 && (
             <Image source={{ uri: post.media[0] }} style={styles.mediaImage} />
          )}

          <View style={styles.postFooter}>
            <View style={styles.interactionRow}>
              <FontAwesome5 name="thumbs-up" size={16} color="#2563eb" style={{marginRight: 6}} />
              <Text style={styles.interactionText}>{post.likes} Curtidas</Text>
            </View>
            <View style={styles.interactionRow}>
              <FontAwesome5 name="comment" size={16} color="#64748b" style={{marginRight: 6}} />
              <Text style={styles.interactionText}>{post.comments} Comentários</Text>
            </View>
          </View>
        </View>

        {/* Área de Comentários (Próxima Etapa) */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>Comentários</Text>
          <Text style={styles.commentsPlaceholder}>A interface de comentários será implementada na próxima etapa.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  topbar: { flexDirection: 'row', backgroundColor: '#ffffff', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', alignItems: 'center', justifyContent: 'space-between', paddingTop: 40 },
  topbarTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  backButton: { padding: 4 },
  scrollContent: { padding: 12 },
  postCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  headerText: { fontSize: 14 },
  author: { fontWeight: 'bold', color: '#0f172a' },
  community: { color: '#2563eb', fontWeight: '600' },
  timestamp: { fontSize: 12, color: '#64748b', marginTop: 2 },
  content: { fontSize: 16, color: '#334155', lineHeight: 24, marginBottom: 12 },
  mediaImage: { width: '100%', height: 300, borderRadius: 8, marginBottom: 12, backgroundColor: '#f8fafc' },
  postFooter: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  interactionRow: { flexDirection: 'row', alignItems: 'center', marginRight: 24 },
  interactionText: { fontSize: 14, color: '#64748b', fontWeight: 'bold' },
  commentsSection: { marginTop: 16, backgroundColor: '#ffffff', borderRadius: 12, padding: 16 },
  commentsTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  commentsPlaceholder: { color: '#64748b', fontStyle: 'italic' }
});