"""
Decode a Drive connector download_file_content tool-result file into a real file.

Usage:
  python3 decode_drive.py <tool-result-file> <output-file>

Finds the base64 "content" field in the tool-result JSON and writes the bytes.
"""

import base64
import json
import sys


def find_content(node):
    if isinstance(node, dict):
        if isinstance(node.get('content'), str):
            return node['content']
        node = list(node.values())
    if isinstance(node, list):
        for item in node:
            if isinstance(item, str) and item.lstrip().startswith('{'):
                try:
                    item = json.loads(item)
                except ValueError:
                    continue
            found = find_content(item)
            if found:
                return found
    return None


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    content = find_content(json.load(open(sys.argv[1])))
    if not content:
        print('No base64 "content" field found.')
        return 1
    data = base64.b64decode(content)
    open(sys.argv[2], 'wb').write(data)
    print(f'wrote {sys.argv[2]} ({len(data)} bytes)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
