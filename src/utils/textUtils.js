export function corruptText(text) {
      const chars = '!<>-_\\\\/[]{}—=+*^?#_';
        return text.split('').map(char => {
            if (char.match(/[a-zA-Z0-9]/) && Math.random() > 0.3) {
                  return chars[Math.floor(Math.random() * chars.length)];
                      }
                          return char;
                            }).join('');
                            }
}