export function escapeString(input: string): string {
  const firstCh = input.charAt(0);
  const isQuotedString = firstCh === '"' || firstCh === "'";
  if (isQuotedString) {
    const unquoted = input.slice(1, input.length - 1);
    return escapeUnquotedString(unquoted);
  }

  return escapeUnquotedString(input);
}

function escapeUnquotedString(input: string): string {
  let res = '';
  let i = 0;
  while (i < input.length) {
    const ch = input.charAt(i);
    if (ch !== '\\') {
      res += ch;
      i++;
      continue;
    }

    const nextCh = input.charAt(i + 1);
    if (nextCh === 'n') {
      res += '\n';
    } else if (nextCh === 'r') {
      res += '\r';
    } else if (nextCh === 'f') {
      res += '\f';
    } else if (nextCh === 'b') {
      res += '\b';
    } else if (nextCh === 't') {
      res += '\t';
    } else {
      res += nextCh;
    }
    i += 2;
  }

  return res;
}
