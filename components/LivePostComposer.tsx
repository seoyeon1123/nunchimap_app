import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { postLive, uploadLivePhoto } from '@/lib/api/live';
import { ApiError } from '@/lib/api';
import {
  fontSize,
  fontWeight,
  palette,
  radius,
  shadow,
  spacing,
} from '@/constants/Theme';

const MAX_LEN = 60;

const OCC_OPTIONS: { value: 1 | 2 | 3; label: string; color: string }[] = [
  { value: 1, label: '널널', color: palette.green },
  { value: 2, label: '보통', color: palette.yellow },
  { value: 3, label: '만석', color: palette.red },
];

interface Props {
  visible: boolean;
  placeId: number;
  placeName?: string;
  checkInId?: number;
  onClose: () => void;
  onPosted?: () => void;
}

export default function LivePostComposer({
  visible,
  placeId,
  placeName,
  checkInId,
  onClose,
  onPosted,
}: Props) {
  const [occupancy, setOccupancy] = useState<1 | 2 | 3 | null>(null);
  const [text, setText] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const qc = useQueryClient();

  const mut = useMutation({
    mutationFn: async () => {
      let photoUrl: string | undefined;
      if (photoUri) {
        setUploading(true);
        try {
          // 1280px 이하로 리사이즈 + JPEG 압축 — 업로드 용량 감소
          const manipulated = await ImageManipulator.manipulateAsync(
            photoUri,
            [{ resize: { width: 1280 } }],
            {
              compress: 0.7,
              format: ImageManipulator.SaveFormat.JPEG,
            },
          );
          const up = await uploadLivePhoto(manipulated.uri, 'image/jpeg');
          photoUrl = up.url;
        } finally {
          setUploading(false);
        }
      }
      return postLive({
        place_id: placeId,
        occupancy: occupancy!,
        text: text.trim() || undefined,
        check_in_id: checkInId,
        photo_url: photoUrl,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['live', placeId] });
      qc.invalidateQueries({ queryKey: ['place', placeId] });
      onPosted?.();
      reset();
      onClose();
    },
    onError: (e) => {
      const msg =
        e instanceof ApiError && (e.body as { error?: string })?.error
          ? (e.body as { error: string }).error
          : e instanceof Error
            ? e.message
            : '게시 실패';
      Alert.alert('실패', msg);
    },
  });

  function reset() {
    setOccupancy(null);
    setText('');
    setPhotoUri(null);
  }

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        '사진 권한 필요',
        '사진을 첨부하려면 갤러리 접근 권한이 필요해요.',
      );
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsMultipleSelection: false,
    });
    if (res.canceled || res.assets.length === 0) return;
    setPhotoUri(res.assets[0].uri);
  }

  function handleSkip() {
    reset();
    onClose();
  }

  function handleSubmit() {
    if (!occupancy) {
      Alert.alert('좌석 상태를 골라주세요');
      return;
    }
    mut.mutate();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleSkip}
    >
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback accessible={false}>
              <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            <Text style={styles.title}>다음 손님께 한 줄 남길래요?</Text>
          </View>
          <Text style={styles.subtle}>
            {placeName ? `${placeName} · ` : ''}30분간 노출돼요
          </Text>

          <View style={styles.occRow}>
            {OCC_OPTIONS.map((opt) => {
              const active = occupancy === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setOccupancy(opt.value)}
                  style={[
                    styles.occChip,
                    active && {
                      backgroundColor: opt.color,
                      borderColor: opt.color,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.occDot,
                      { backgroundColor: active ? 'white' : opt.color },
                    ]}
                  />
                  <Text
                    style={[
                      styles.occLabel,
                      active && { color: 'white' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View>
            <TextInput
              style={styles.input}
              placeholder="콘센트 자리 다 찼음 (선택)"
              placeholderTextColor={palette.textDim}
              maxLength={MAX_LEN}
              value={text}
              onChangeText={setText}
              multiline
            />
            <Text style={styles.charCount}>
              {text.length} / {MAX_LEN}
            </Text>
          </View>

          {photoUri ? (
            <View style={styles.photoWrap}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              <Pressable
                style={styles.photoRemove}
                onPress={() => setPhotoUri(null)}
                hitSlop={8}
              >
                <FontAwesome name="close" size={12} color="white" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.photoBtn}
              onPress={pickPhoto}
              disabled={mut.isPending}
            >
              <FontAwesome name="camera" size={14} color={palette.textMuted} />
              <Text style={styles.photoBtnText}>사진 첨부 (선택)</Text>
            </Pressable>
          )}

          <View style={styles.actions}>
            <Pressable
              onPress={handleSkip}
              style={[styles.btn, styles.btnGhost]}
              disabled={mut.isPending}
            >
              <Text style={styles.btnGhostText}>건너뛰기</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              style={[
                styles.btn,
                styles.btnPrimary,
                (!occupancy || mut.isPending) && styles.btnDisabled,
              ]}
              disabled={!occupancy || mut.isPending}
            >
              {mut.isPending ? (
                <View style={styles.btnBusy}>
                  <ActivityIndicator color="white" size="small" />
                  {uploading ? (
                    <Text style={styles.btnPrimaryText}>사진 업로드 중…</Text>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.btnPrimaryText}>라이브 게시</Text>
              )}
            </Pressable>
          </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kav: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: palette.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadow.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: palette.redSoft,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.red,
  },
  liveText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.bold as '700',
    color: palette.red,
    letterSpacing: 0.5,
  },
  title: {
    flex: 1,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold as '700',
    color: palette.text,
  },
  subtle: {
    fontSize: fontSize.caption,
    color: palette.textMuted,
    marginTop: -spacing.xs,
  },
  occRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  occChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  occDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  occLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold as '600',
    color: palette.text,
  },
  input: {
    minHeight: 64,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.subtle,
    fontSize: fontSize.body,
    color: palette.text,
    textAlignVertical: 'top',
  },
  charCount: {
    textAlign: 'right',
    fontSize: fontSize.micro,
    color: palette.textDim,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhost: {
    backgroundColor: palette.subtle,
  },
  btnGhostText: {
    color: palette.textMuted,
    fontWeight: fontWeight.semibold as '600',
    fontSize: fontSize.body,
  },
  btnPrimary: {
    flex: 2,
    backgroundColor: palette.primary,
  },
  btnPrimaryText: {
    color: palette.textOnPrimary,
    fontWeight: fontWeight.bold as '700',
    fontSize: fontSize.body,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnBusy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    borderStyle: 'dashed',
    backgroundColor: palette.subtle,
  },
  photoBtnText: {
    fontSize: fontSize.caption,
    color: palette.textMuted,
    fontWeight: fontWeight.semibold as '600',
  },
  photoWrap: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  photoPreview: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    backgroundColor: palette.subtle,
  },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: palette.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
