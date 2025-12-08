// 이미지와 동영상 파일 목록을 가져오는 함수
export async function getMediaFiles() {
  try {
    const response = await fetch('/api/media');
    const data = await response.json();
    return {
      images: data.images || [],
      videos: data.videos || []
    };
  } catch (error) {
    console.error('Error fetching media files:', error);
    return {
      images: [],
      videos: []
    };
  }
}
