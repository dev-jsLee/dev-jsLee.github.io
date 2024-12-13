import json
import os

def create_index_html(folder_name, folder_path):
    # 주제별 index.html 파일 내용 생성
    html_content = f'''<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{folder_name} 데이터</title>
</head>
<body>
    <header>
        <h1>{folder_name} 데이터</h1>
    </header>
    <nav>
        <a href="../index.html">메인 페이지로 돌아가기</a>
    </nav>
    <main>
        <h2>파일 목록</h2>
        <ul id="file-list">
            <!-- 파일 목록이 여기에 동적으로 추가됩니다. -->
        </ul>
    </main>
    <script>
        document.addEventListener("DOMContentLoaded", function() {{
            fetch('files.json')
                .then(response => response.json())
                .then(data => {{
                    const fileList = document.getElementById('file-list');
                    data.forEach(file => {{
                        const listItem = document.createElement('li');
                        listItem.innerHTML = `<a href="${{file.path}}">${{file.name}}</a>`;
                        fileList.appendChild(listItem);
                    }});
                }})
                .catch(error => console.error('Error loading file list:', error));
        }});
    </script>
</body>
</html>
'''

    # index.html 파일 저장
    output_file_path = os.path.join(folder_path, 'index.html')
    with open(output_file_path, 'w', encoding='utf-8') as output_file:
        output_file.write(html_content)

    print(f"{output_file_path} 파일이 생성되었습니다.")

def rebuild_html():
    # index.json 파일 경로
    index_json_path = 'index.json'
    
    # index.json 파일을 읽어옴
    if not os.path.exists(index_json_path):
        print(f"{index_json_path} 파일이 존재하지 않습니다.")
        return

    with open(index_json_path, 'r', encoding='utf-8') as json_file:
        data = json.load(json_file)

    # HTML 파일 생성
    html_content = '''<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>주제 목록</title>
</head>
<body>
    <header>
        <h1>주제 목록</h1>
    </header>
    <nav>
        <ul>
'''

    # 각 항목에 대해 링크 생성
    for item in data:
        folder_name = os.path.basename(os.path.dirname(item['path']))  # 상위 폴더명 추출
        html_content += f'            <li><a href="{item["path"]}">{folder_name}</a></li>\n'
        
        # 하위 폴더의 index.html 생성
        create_index_html(folder_name, os.path.dirname(item['path']))

    # HTML 마무리
    html_content += '''        </ul>
    </nav>
</body>
</html>
'''

    # HTML 파일 저장
    output_file_path = 'index.html'
    with open(output_file_path, 'w', encoding='utf-8') as output_file:
        output_file.write(html_content)

    print(f"{output_file_path} 파일이 생성되었습니다.")

if __name__ == "__main__":
    rebuild_html()
