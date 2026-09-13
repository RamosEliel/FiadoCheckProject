import { Text, type StyleProp, type TextStyle } from 'react-native';
import { AppFonts } from '@/constants/theme';

type Props = {
  text: string;
  style: StyleProp<TextStyle>;
  boldStyle?: TextStyle;
};

const BOLD_SPLIT = /(\*\*[^*]+\*\*)/g;
const BOLD_TOKEN = /^\*\*([^*]+)\*\*$/;

function renderLine(line: string, boldStyle?: TextStyle) {
  const parts = line.split(BOLD_SPLIT);
  return parts.map((part, index) => {
    const match = part.match(BOLD_TOKEN);
    if (match) {
      return (
        <Text key={`${index}-${match[1]}`} style={[{ fontFamily: AppFonts.semiBold }, boldStyle]}>
          {match[1]}
        </Text>
      );
    }
    return <Text key={`${index}-${part}`}>{part}</Text>;
  });
}

export function RichMessageText({ text, style, boldStyle }: Props) {
  const lines = text.split('\n');

  return (
    <Text style={style}>
      {lines.map((line, index) => (
        <Text key={`line-${index}`}>
          {renderLine(line, boldStyle)}
          {index < lines.length - 1 ? '\n' : null}
        </Text>
      ))}
    </Text>
  );
}
