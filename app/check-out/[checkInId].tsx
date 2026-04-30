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
import { finishGpsCheckIn } from '@/lib/api/checkins';
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

export default function CheckOutScreen() {
  const { checkInId, place } = useLocalSearchParams<{
    checkInId: string;
    place?: string;
  }>();
  const id = Number(checkInId);
  const router = useRouter();
  const qc = useQueryClient();

  const [signal, setSignal] = useState<ActiveSignal | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!signal) {
      Alert.alert('신호를 선택해주세요');
      return;
    }
    setBusy(true);
    try {
      const res = await finishGpsCheckIn(id, {
        signal,
        tags: tags.length > 0 ? tags : undefined,
        text: text.trim() || undefined,
      });
      qc.invalidateQueries({ queryKey: ['place', res.place_id] });
      qc.invalidateQueries({ queryKey: ['my-checkins'] });
      Alert.alert(
        '체크인 완료',
        `${(res.duration_min / 60).toFixed(1)}시간 머물렀어요.`,
        [
          {
            text: '확인',
            onPress: () => router.replace(`/places/${res.place_id}`),
          },
        ],
      );
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
          {place ? <Text style={styles.placeName}>{place}</Text> : null}
          <Text style={styles.helper}>지금 카페 분위기는 어땠나요?</Text>

          <SignalPicker value={signal} onChange={setSignal} />

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
            (busy || !signal) && styles.submitDisabled,
          ]}
          onPress={submit}
          disabled={busy || !signal}
        >
          <Text style={styles.submitText}>{busy ? '저장 중…' : '제출하기'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl },
  placeName: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold as '700',
    color: palette.text,
  },
  helper: {
    color: palette.textMuted,
    fontSize: fontSize.body,
    marginTop: -spacing.xs,
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
});
