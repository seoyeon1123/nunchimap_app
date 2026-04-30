import { useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import SignalPicker from '@/components/SignalPicker';
import TagPicker from '@/components/TagPicker';
import DurationPicker from '@/components/DurationPicker';
import { useMe } from '@/lib/hooks/useAuth';
import { postManualReview } from '@/lib/api/checkins';
import { ApiError } from '@/lib/api';
import {
  fontSize,
  fontWeight,
  palette,
  radius,
  shadow,
  spacing,
} from '@/constants/Theme';

type ActiveSignal = 'green' | 'yellow' | 'red';

export default function ManualReviewScreen() {
  const { placeId } = useLocalSearchParams<{ placeId: string }>();
  const id = Number(placeId);
  const router = useRouter();
  const qc = useQueryClient();
  const { data: me } = useMe();

  const [duration, setDuration] = useState<number | null>(null);
  const [signal, setSignal] = useState<ActiveSignal | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  if (!me) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>로그인이 필요합니다.</Text>
        <Pressable
          style={styles.linkBtn}
          onPress={() => router.replace('/(tabs)/two')}
        >
          <Text style={styles.linkText}>로그인하러 가기</Text>
        </Pressable>
      </View>
    );
  }

  async function submit() {
    if (!duration) return Alert.alert('체류 시간을 선택해주세요');
    if (!signal) return Alert.alert('신호를 선택해주세요');
    setBusy(true);
    try {
      await postManualReview({
        place_id: id,
        duration_min: duration,
        signal,
        tags: tags.length > 0 ? tags : undefined,
        text: text.trim() || undefined,
      });
      qc.invalidateQueries({ queryKey: ['place', id] });
      qc.invalidateQueries({ queryKey: ['my-checkins'] });
      Alert.alert('저장됨', '리뷰가 등록되었어요.', [
        { text: '확인', onPress: () => router.replace(`/places/${id}`) },
      ]);
    } catch (e) {
      const msg =
        e instanceof ApiError && (e.body as { error?: string })?.error
          ? (e.body as { error: string }).error
          : e instanceof Error
            ? e.message
            : '저장 실패';
      Alert.alert('실패', msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>얼마나 머무르셨나요?</Text>
            <DurationPicker value={duration} onChange={setDuration} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>분위기는 어땠나요?</Text>
            <SignalPicker value={signal} onChange={setSignal} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>해당하는 태그</Text>
            <TagPicker value={tags} onChange={setTags} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>한 줄 후기 (선택)</Text>
            <TextInput
              style={styles.textArea}
              multiline
              maxLength={140}
              value={text}
              onChangeText={setText}
              placeholder="콘센트 자리 많고 조용해요"
              placeholderTextColor={palette.textDim}
            />
            <Text style={styles.charCount}>{text.length} / 140</Text>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>

      <View style={styles.footer}>
        <Pressable
          style={[
            styles.submit,
            (busy || !signal || !duration) && styles.submitDisabled,
          ]}
          onPress={submit}
          disabled={busy || !signal || !duration}
        >
          <Text style={styles.submitText}>{busy ? '저장 중…' : '제출하기'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: palette.bg,
  },
  section: { gap: spacing.sm },
  sectionTitle: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold as '700',
    color: palette.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  textArea: {
    minHeight: 96,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    fontSize: fontSize.body,
    color: palette.text,
    textAlignVertical: 'top',
  },
  charCount: {
    textAlign: 'right',
    fontSize: fontSize.micro,
    color: palette.textDim,
  },
  footer: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: palette.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  submit: {
    paddingVertical: spacing.md + 4,
    borderRadius: radius.md,
    backgroundColor: palette.primary,
    alignItems: 'center',
    ...shadow.sm,
  },
  submitDisabled: { backgroundColor: palette.textDim },
  submitText: {
    color: 'white',
    fontWeight: fontWeight.bold as '700',
    fontSize: fontSize.body,
  },
  muted: { color: palette.textMuted, fontSize: fontSize.body },
  linkBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: palette.primary,
    borderRadius: radius.pill,
  },
  linkText: {
    color: 'white',
    fontWeight: fontWeight.semibold as '600',
    fontSize: fontSize.body,
  },
});
