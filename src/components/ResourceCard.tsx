import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ExternalLink, 
  Edit3, 
  Trash2, 
  Star, 
  PlayCircle, 
  Globe, 
  FileText, 
  Image as ImageIcon, 
  Bookmark, 
  BookOpen,
  Clock
} from 'lucide-react';
import type { Resource, ResourceType } from '../types';
import { SUBJECTS } from '../types';
import { useStore } from '../store/useStore';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

interface ResourceCardProps {
  resource: Resource;
  onEdit?: (resource: Resource) => void;
  onDelete?: (resource: Resource) => void;
  onToggleFavorite?: (resource: Resource) => void;
}

const TYPE_CONFIG: Record<
  ResourceType,
  { label: string; icon: React.ComponentType<{ className?: string }>; bg: string; text: string; gradient: string }
> = {
  youtube: {
    label: 'YouTube',
    icon: PlayCircle,
    bg: 'bg-rose-50 text-rose-600 border-rose-200',
    text: 'text-rose-600',
    gradient: 'from-rose-500 to-red-600',
  },
  website: {
    label: 'เว็บไซต์',
    icon: Globe,
    bg: 'bg-blue-50 text-blue-600 border-blue-200',
    text: 'text-blue-600',
    gradient: 'from-blue-500 to-cyan-600',
  },
  document: {
    label: 'เอกสาร / ชีท',
    icon: FileText,
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    text: 'text-amber-700',
    gradient: 'from-amber-500 to-orange-600',
  },
  image: {
    label: 'รูปภาพ / ชาร์ต',
    icon: ImageIcon,
    bg: 'bg-purple-50 text-purple-600 border-purple-200',
    text: 'text-purple-600',
    gradient: 'from-purple-500 to-indigo-600',
  },
  other: {
    label: 'อื่นๆ',
    icon: Bookmark,
    bg: 'bg-slate-50 text-slate-600 border-slate-200',
    text: 'text-slate-600',
    gradient: 'from-slate-600 to-slate-800',
  },
};

export const ResourceCard: React.FC<ResourceCardProps> = ({
  resource,
  onEdit,
  onDelete,
  onToggleFavorite,
}) => {
  const { lessons, recordResourceOpened, toggleFavoriteResource } = useStore();
  const [imageError, setImageError] = useState(false);

  const typeConfig = TYPE_CONFIG[resource.type] || TYPE_CONFIG.other;
  const TypeIcon = typeConfig.icon;
  const subjectInfo = resource.subject ? SUBJECTS[resource.subject] : null;
  const linkedLesson = resource.lessonId
    ? lessons.find((l) => l.id === resource.lessonId)
    : null;

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    recordResourceOpened(resource.id);
    window.open(resource.url, '_blank', 'noopener,noreferrer');
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(resource);
    } else {
      toggleFavoriteResource(resource.id);
    }
  };

  const lastOpenedText = resource.lastOpened
    ? formatDistanceToNow(parseISO(resource.lastOpened), { addSuffix: true, locale: th })
    : null;

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      {/* Thumbnail or Fallback Header */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
        {resource.thumbnail && !imageError ? (
          <img
            src={resource.thumbnail}
            alt={resource.title}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className={`flex h-full w-full flex-col items-center justify-center bg-gradient-to-br ${typeConfig.gradient} p-4 text-white`}>
            <TypeIcon className="h-10 w-10 opacity-90 transition-transform group-hover:scale-110" />
            <span className="mt-2 text-xs font-semibold tracking-wide uppercase opacity-85">
              {typeConfig.label}
            </span>
          </div>
        )}

        {/* Favorite Button Overlay */}
        <button
          onClick={handleFavoriteClick}
          aria-label={resource.favorite ? 'ลบออกจากรายการโปรด' : 'เพิ่มในรายการโปรด'}
          className="absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-xs backdrop-blur-xs transition-transform hover:scale-110 active:scale-95"
        >
          <Star
            className={`h-4 w-4 ${
              resource.favorite
                ? 'fill-amber-400 text-amber-500'
                : 'text-slate-400 hover:text-amber-500'
            }`}
          />
        </button>

        {/* Type Badge Overlay */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-lg bg-black/60 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-xs">
          <TypeIcon className="h-3 w-3" />
          <span>{typeConfig.label}</span>
        </div>
      </div>

      {/* Content Body */}
      <div className="flex flex-1 flex-col p-4">
        {/* Badges: Subject & Linked Lesson */}
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {subjectInfo && (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
              <span className={`h-1.5 w-1.5 rounded-full ${subjectInfo.color}`} />
              {subjectInfo.name}
            </span>
          )}

          {linkedLesson ? (
            <Link
              to={`/lessons/${linkedLesson.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100 transition-colors"
              title={`บทเรียน: ${linkedLesson.title}`}
            >
              <BookOpen className="h-3 w-3" />
              <span className="max-w-[140px] truncate">{linkedLesson.title}</span>
            </Link>
          ) : resource.lessonId ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">
              <BookOpen className="h-3 w-3" />
              บทเรียนเชื่อมโยง
            </span>
          ) : null}
        </div>

        {/* Title */}
        <h3
          onClick={handleOpen}
          className="line-clamp-2 cursor-pointer text-sm font-bold text-slate-900 transition-colors hover:text-blue-600"
          title={resource.title}
        >
          {resource.title}
        </h3>

        {/* Description */}
        {resource.description && (
          <p className="mt-1.5 line-clamp-2 text-xs text-slate-500">
            {resource.description}
          </p>
        )}

        {/* Meta / Last opened */}
        <div className="mt-auto pt-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="truncate max-w-[180px]" title={resource.url}>
              {(() => {
                try {
                  return new URL(resource.url).hostname.replace('www.', '');
                } catch {
                  return resource.url;
                }
              })()}
            </span>
            {lastOpenedText && (
              <span className="flex items-center gap-1 text-[10px]" title={`เปิดล่าสุด: ${resource.lastOpened}`}>
                <Clock className="h-3 w-3" />
                เปิด {lastOpenedText}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/75 px-4 py-2.5">
        <button
          onClick={handleOpen}
          aria-label={`เปิดแหล่งเรียนรู้: ${resource.title}`}
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 active:scale-95"
        >
          <span>เปิดเรียน</span>
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              onClick={() => onEdit(resource)}
              aria-label={`แก้ไขแหล่งเรียนรู้ ${resource.title}`}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
            >
              <Edit3 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(resource)}
              aria-label={`ลบแหล่งเรียนรู้ ${resource.title}`}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
