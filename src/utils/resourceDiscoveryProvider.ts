import type { ResourceType, ResourceRole, SubjectId } from '../types';
import { extractYouTubeVideoId } from '../components/study/YouTubePlayer';

/* =========================================================================
   Phase 31: Resource Discovery Provider Abstraction
   
   Decoupled architecture:
   - Provider interface supports multi-platform discovery
   - Resilient: Works with curated knowledge base without requiring API keys
   - Graceful fallback: Manual URL mode always available
   ========================================================================= */

export interface ResourceDiscoveryItem {
  id: string;
  title: string;
  url: string;
  type: ResourceType;
  provider: string;
  description: string;
  thumbnail?: string;
  canEmbed: boolean;
  suggestedRole?: ResourceRole;
  subjectId?: SubjectId;
  keywords: string[];
}

export interface ResourceProvider {
  name: string;
  search(query: string, subject?: SubjectId): Promise<ResourceDiscoveryItem[]>;
  getMetadata(url: string): Promise<Partial<ResourceDiscoveryItem>>;
  canEmbed(url: string): boolean;
  getThumbnail(url: string): string | undefined;
}

// ── Curated Knowledge Base for Offline/Zero-Key Discovery ──
export const CURATED_ENGINEERING_RESOURCES: ResourceDiscoveryItem[] = [
  // Programming & Python
  {
    id: 'cur-py-1',
    title: 'Python Official Tutorial: Defining Functions',
    url: 'https://docs.python.org/3/tutorial/controlflow.html#defining-functions',
    type: 'website',
    provider: 'Python Docs',
    description: 'เอกสารคู่มือทางการของ Python อธิบายการประกาศฟังก์ชัน def, argument, return value และ scope',
    canEmbed: false,
    suggestedRole: 'reference',
    subjectId: 'programming',
    keywords: ['python', 'function', 'def', 'beginner', 'programming', 'arguments'],
  },
  {
    id: 'cur-py-2',
    title: 'CS50 Python: Functions and Variables',
    url: 'https://www.youtube.com/watch?v=JP7ITIXG1gw',
    type: 'youtube',
    provider: 'Harvard CS50',
    description: 'Harvard University CS50P Lecture 0 - การเขียนฟังก์ชัน ตัวแปร และฟังก์ชันในตัว',
    thumbnail: 'https://img.youtube.com/vi/JP7ITIXG1gw/hqdefault.jpg',
    canEmbed: true,
    suggestedRole: 'primary',
    subjectId: 'programming',
    keywords: ['python', 'cs50', 'harvard', 'function', 'variables', 'beginner'],
  },
  {
    id: 'cur-py-3',
    title: 'LeetCode 75: Practice Coding Problems',
    url: 'https://leetcode.com/studyplan/leetcode-75/',
    type: 'website',
    provider: 'LeetCode',
    description: 'ชุดโจทย์ฝึกเขียนโปรแกรม 75 ข้อสำคัญสำหรับฝึกทักษะ Problem Solving และ Data Structures',
    canEmbed: false,
    suggestedRole: 'practice',
    subjectId: 'programming',
    keywords: ['practice', 'leetcode', 'algorithms', 'python', 'coding', 'problem'],
  },
  {
    id: 'cur-py-4',
    title: 'Python Data Structures & OOP Guide',
    url: 'https://realpython.com/python-classes/',
    type: 'document',
    provider: 'Real Python',
    description: 'บทความอธิบายเชิงลึกเรื่อง Object-Oriented Programming, Class, Method และ Inheritance',
    canEmbed: false,
    suggestedRole: 'alternative',
    subjectId: 'programming',
    keywords: ['python', 'oop', 'class', 'object', 'data structures'],
  },

  // Mathematics
  {
    id: 'cur-math-1',
    title: 'Essence of Linear Algebra - 3Blue1Brown',
    url: 'https://www.youtube.com/watch?v=fNk_zzaMoSs',
    type: 'youtube',
    provider: '3Blue1Brown',
    description: 'การทำความเข้าใจ Linear Algebra เชิงเรขาคณิต เวกเตอร์ การแปลงเชิงเส้น และเมทริกซ์',
    thumbnail: 'https://img.youtube.com/vi/fNk_zzaMoSs/hqdefault.jpg',
    canEmbed: true,
    suggestedRole: 'primary',
    subjectId: 'math',
    keywords: ['math', 'linear algebra', 'vectors', 'matrices', '3blue1brown'],
  },
  {
    id: 'cur-math-2',
    title: 'MIT 18.01 Single Variable Calculus Lecture Notes (PDF)',
    url: 'https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/resources/mit18_01sc_notes/',
    type: 'pdf',
    provider: 'MIT OpenCourseWare',
    description: 'เอกสารสรุปทฤษฎีแคลคูลัส 1: อนุพันธ์ ปริพันธ์ กฎลูกโซ่ และการประยุกต์',
    canEmbed: true,
    suggestedRole: 'reference',
    subjectId: 'math',
    keywords: ['math', 'calculus', 'derivatives', 'integrals', 'mit', 'pdf'],
  },
  {
    id: 'cur-math-3',
    title: 'Paul’s Online Math Notes: Calculus Practice',
    url: 'https://tutorial.math.lamar.edu/Classes/CalcI/CalcI.aspx',
    type: 'website',
    provider: 'Lamar University',
    description: 'แบบฝึกหัดแคลคูลัสพร้อมเฉลยละเอียดทีละขั้นตอน ครอบคลุมตั้งแต่ลิมิตจนถึงการอินทิเกรต',
    canEmbed: false,
    suggestedRole: 'practice',
    subjectId: 'math',
    keywords: ['math', 'calculus', 'practice', 'problems', 'solutions', 'limits'],
  },

  // Physics
  {
    id: 'cur-phys-1',
    title: 'Classical Mechanics: Kinematics & Newton’s Laws',
    url: 'https://www.youtube.com/watch?v=b1t41Q3xRM8',
    type: 'youtube',
    provider: 'Walter Lewin / MIT',
    description: 'การเคลื่อนที่ 1 มิติ 2 มิติ เวกเตอร์ตำแหน่ง ความเร็ว ความเร่ง และกฎของนิวตัน',
    thumbnail: 'https://img.youtube.com/vi/b1t41Q3xRM8/hqdefault.jpg',
    canEmbed: true,
    suggestedRole: 'primary',
    subjectId: 'physics',
    keywords: ['physics', 'kinematics', 'mechanics', 'newton', 'velocity', 'acceleration'],
  },
  {
    id: 'cur-phys-2',
    title: 'Physics LibreTexts: Work, Energy and Momentum (PDF)',
    url: 'https://phys.libretexts.org/Bookshelves/University_Physics',
    type: 'pdf',
    provider: 'LibreTexts',
    description: 'ตำราฟิสิกส์มหาวิทยาลัยแบบ Open Source หัวข้องาน พลังงาน และโมเมนตัม',
    canEmbed: true,
    suggestedRole: 'reference',
    subjectId: 'physics',
    keywords: ['physics', 'energy', 'work', 'momentum', 'textbook'],
  },

  // AI & Machine Learning
  {
    id: 'cur-ai-1',
    title: 'Stanford CS229: Machine Learning Course',
    url: 'https://www.youtube.com/watch?v=jGwO_UgTS7I',
    type: 'youtube',
    provider: 'Stanford University',
    description: 'การบรรยายวิชา Machine Learning โดย Andrew Ng: Supervised Learning, Cost Function, Gradient Descent',
    thumbnail: 'https://img.youtube.com/vi/jGwO_UgTS7I/hqdefault.jpg',
    canEmbed: true,
    suggestedRole: 'primary',
    subjectId: 'ai',
    keywords: ['ai', 'machine learning', 'stanford', 'andrew ng', 'gradient descent'],
  },
  {
    id: 'cur-ai-2',
    title: 'Scikit-Learn Machine Learning Documentation',
    url: 'https://scikit-learn.org/stable/user_guide.html',
    type: 'website',
    provider: 'Scikit-Learn',
    description: 'คู่มือการใช้งาน Scikit-learn สำหรับ Regression, Classification, Clustering และ Preprocessing',
    canEmbed: false,
    suggestedRole: 'reference',
    subjectId: 'ai',
    keywords: ['ai', 'scikit-learn', 'python', 'classification', 'regression'],
  },

  // TGAT 3
  {
    id: 'cur-tgat-1',
    title: 'TGAT 3 สมรรถนะการทำงานในอนาคต: การคิดเชิงวิเคราะห์',
    url: 'https://mytgat.com/tgat3-guide',
    type: 'document',
    provider: 'MyTGAT Guide',
    description: 'แนวข้อสอบและการเตรียมตัวสอบ TGAT 3: การสร้างคุณค่าและนวัตกรรม การแก้ปัญหาที่ซับซ้อน',
    canEmbed: false,
    suggestedRole: 'primary',
    subjectId: 'tgat3',
    keywords: ['tgat3', 'tgat', 'exam', 'analytical thinking', 'practice'],
  },
];

export class DefaultResourceProvider implements ResourceProvider {
  name = 'Standard Knowledge Hub';

  canEmbed(url: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    return Boolean(
      extractYouTubeVideoId(url) ||
      lower.endsWith('.pdf') ||
      lower.includes('/pdf')
    );
  }

  getThumbnail(url: string): string | undefined {
    const yId = extractYouTubeVideoId(url);
    if (yId) {
      return `https://img.youtube.com/vi/${yId}/hqdefault.jpg`;
    }
    return undefined;
  }

  async getMetadata(url: string): Promise<Partial<ResourceDiscoveryItem>> {
    const yId = extractYouTubeVideoId(url);
    const lower = url.toLowerCase();

    let type: ResourceType = 'website';
    let provider = 'Web Resource';

    if (yId) {
      type = 'youtube';
      provider = 'YouTube';
    } else if (lower.endsWith('.pdf') || lower.includes('/pdf')) {
      type = 'pdf';
      provider = 'PDF Document';
    } else if (lower.includes('github.com')) {
      provider = 'GitHub';
    } else if (lower.includes('coursera.org')) {
      provider = 'Coursera';
    } else if (lower.includes('ocw.mit.edu')) {
      provider = 'MIT OpenCourseWare';
    }

    return {
      url,
      type,
      provider,
      canEmbed: this.canEmbed(url),
      thumbnail: this.getThumbnail(url),
    };
  }

  async search(query: string, subject?: SubjectId): Promise<ResourceDiscoveryItem[]> {
    const q = (query || '').toLowerCase().trim();
    const words = q.split(/\s+/).filter(Boolean);

    let list = CURATED_ENGINEERING_RESOURCES;

    if (subject && subject !== 'math' && subject !== 'programming' && subject !== 'physics' && subject !== 'tgat3' && subject !== 'ai') {
      // no subject filter
    } else if (subject) {
      list = list.filter((r) => !r.subjectId || r.subjectId === subject);
    }

    if (words.length === 0) {
      return list;
    }

    return list.filter((r) => {
      const fullText = `${r.title} ${r.description} ${r.provider} ${r.keywords.join(' ')}`.toLowerCase();
      if (fullText.includes(q)) return true;
      return words.every((w) => fullText.includes(w));
    });
  }
}

export const defaultResourceProvider = new DefaultResourceProvider();
