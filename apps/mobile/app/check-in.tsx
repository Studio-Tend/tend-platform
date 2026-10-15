import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, Fraunces_400Regular } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';

import {
  FEELINGS,
  NOTE_MAX,
  CheckInSchema,
  type Feeling,
} from '@tend/core';

const palette = {
  cream: '#FAFAF8',
  ink: '#17161F',
  doorBlue: '#A3B1D3',
  deepShade: '#5C6C97',
  hairline: 'rgba(23, 22, 31, 0.12)',
  muted: 'rgba(23, 22, 31, 0.55)',
};

/** Stand-in until goals are real. One goal, hardcoded, no storage. */
const GOAL = {
  id: 'goal_placeholder',
  title: 'Walk Effie before the day starts',
};

export default function CheckInScreen() {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<Feeling | null>(null);
  const [note, setNote] = useState('');

  const [fontsLoaded] = useFonts({
    Fraunces_400Regular,
    Inter_400Regular,
    Inter_500Medium,
  });

  const remaining = useMemo(() => NOTE_MAX - note.length, [note]);

  if (!fontsLoaded) {
    return <View style={styles.screen} />;
  }

  function handleSave() {
    if (!selected) return;

    const checkIn = CheckInSchema.parse({
      id: `checkin_${Date.now()}`,
      goalId: GOAL.id,
      feeling: selected,
      note: note.trim() ? note.trim() : undefined,
      createdAt: new Date().toISOString(),
    });

    console.log('check-in', checkIn);

    setSelected(null);
    setNote('');
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.goal}>{GOAL.title}</Text>
      <Text style={styles.question}>How did it feel?</Text>

      <View style={styles.options}>
        {FEELINGS.map((feeling) => {
          const isSelected = feeling === selected;
          return (
            <Pressable
              key={feeling}
              onPress={() => setSelected(feeling)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={feeling}
              style={({ pressed }) => [
                styles.option,
                isSelected && styles.optionSelected,
                pressed && !isSelected && styles.optionPressed,
              ]}
            >
              <Text
                style={[
                  styles.optionLabel,
                  isSelected && styles.optionLabelSelected,
                ]}
              >
                {feeling}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selected ? (
        <View style={styles.noteBlock}>
          <TextInput
            value={note}
            onChangeText={(text) => setNote(text.slice(0, NOTE_MAX))}
            placeholder="Anything worth remembering?"
            placeholderTextColor={palette.muted}
            style={styles.noteInput}
            multiline
            maxLength={NOTE_MAX}
            accessibilityLabel="Note about this check-in"
          />
          {remaining <= 40 ? (
            <Text style={styles.counter}>{remaining} left</Text>
          ) : null}
        </View>
      ) : null}

      <Pressable
        onPress={handleSave}
        disabled={!selected}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.save,
          !selected && styles.saveDisabled,
          pressed && selected && styles.savePressed,
        ]}
      >
        <Text style={styles.saveLabel}>Save check-in</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.cream,
  },
  content: {
    paddingHorizontal: 28,
  },
  goal: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: palette.muted,
    marginBottom: 10,
  },
  question: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 34,
    lineHeight: 42,
    color: palette.ink,
    marginBottom: 36,
  },
  options: {
    gap: 10,
  },
  option: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: 'transparent',
  },
  optionPressed: {
    backgroundColor: 'rgba(163, 177, 211, 0.14)',
  },
  optionSelected: {
    backgroundColor: palette.doorBlue,
    borderColor: palette.doorBlue,
  },
  optionLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 17,
    color: palette.ink,
  },
  optionLabelSelected: {
    fontFamily: 'Inter_500Medium',
    color: '#FFFFFF',
  },
  noteBlock: {
    marginTop: 28,
  },
  noteInput: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: palette.ink,
    minHeight: 88,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.hairline,
    textAlignVertical: 'top',
  },
  counter: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: palette.muted,
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  save: {
    marginTop: 40,
    paddingVertical: 18,
    borderRadius: 4,
    backgroundColor: palette.deepShade,
    alignItems: 'center',
  },
  saveDisabled: {
    opacity: 0.35,
  },
  savePressed: {
    opacity: 0.85,
  },
  saveLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: '#FFFFFF',
  },
});