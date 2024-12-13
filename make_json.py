import json
import os

index_json_file_name = "index.json"
data_json_file_name = "data.json"

def load_ignore_list(directory):
    ignore_file_path = os.path.join(directory, '.ignore')
    ignore_list = set()
    
    # .ignore 파일이 없으면 생성하고 사용 방법을 주석으로 추가
    if not os.path.exists(ignore_file_path):
        with open(ignore_file_path, 'w', encoding='utf-8') as f:
            f.write("# 무시할 파일 및 폴더 목록\n")
            f.write("# 예시:\n")
            f.write("# .git\n")
            f.write("# *.tmp\n")
            f.write("# *.log\n")
        print(f"{ignore_file_path} 파일이 생성되었습니다. 무시할 파일 및 폴더 목록을 추가하세요.")
    
    # .ignore 파일이 존재하면 내용을 읽어옴
    with open(ignore_file_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):  # 주석 및 빈 줄 무시
                ignore_list.add(line)
    
    return ignore_list

def generate_file_list(directory, ignore_list: set):
    files = []
    ignore_list.update([data_json_file_name, index_json_file_name, "index.html"])
    
    # 현재 디렉토리 내의 파일만 탐색
    for filename in os.listdir(directory):
        if filename in ignore_list:
            continue
        if filename.endswith('.csv') or filename.endswith('.json'):
            # 파일 경로와 이름을 추가
            relative_path = os.path.relpath(os.path.join(directory, filename), start=directory)
            file_type = filename.split('.')[-1]
            files.append({
                'name': f'{filename.split(".")[0]}',
                'path': relative_path,
                "type": file_type
            })
    
    # 파일이 존재할 경우에만 JSON 파일로 저장
    json_file_path = os.path.join(directory, 'files.json')
    if files:
        with open(json_file_path, 'w', encoding='utf-8') as json_file:
            json.dump(files, json_file, ensure_ascii=False, indent=4)
        print(f"{json_file_path} 파일이 생성되었습니다.")
    else:
        if os.path.exists(json_file_path): os.remove(json_file_path)
        print(f"{directory}에 파일이 없으므로 files.json을 생성하지 않습니다.")

def generate_folders_list(directory, ignore_list):
    folders = []
    # 주제별 폴더 목록 생성
    for item in os.listdir(directory):
        item_path = os.path.join(directory, item)
        if os.path.isdir(item_path) and item != '.git' and item not in ignore_list:
            folders.append({
                'name': item,
                'path': os.path.join(item_path, 'index.html')
            })
    
    # 폴더가 존재할 경우에만 JSON 파일로 저장
    folders_file_path = os.path.join(directory, 'index.json')
    if folders:
        with open(folders_file_path, 'w', encoding='utf-8') as json_file:
            json.dump(folders, json_file, ensure_ascii=False, indent=4)
        print(f"{folders_file_path} 파일이 생성되었습니다.")
    else:
        if os.path.exists(folders_file_path): os.remove(folders_file_path)
        print(f"{directory}에 폴더가 없으므로 folders.json을 생성하지 않습니다.")

def process_directory(directory):
    # 무시할 파일 및 폴더 목록 로드
    ignore_list = load_ignore_list(directory)
    
    # 현재 디렉토리에 대해 files.json과 folders.json 생성
    generate_file_list(directory, ignore_list)
    generate_folders_list(directory, ignore_list)

    # 하위 디렉토리에 대해 재귀적으로 호출
    for item in os.listdir(directory):
        item_path = os.path.join(directory, item)
        if os.path.isdir(item_path) and item != '.git' and item not in ignore_list:
            process_directory(item_path)

if __name__ == "__main__":
    # 루트 디렉토리에서 시작
    process_directory('.')