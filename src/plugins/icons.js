// Registro global de todos los iconos Lucide usados en el proyecto
import {
  Home, Trophy, Users, User, Calendar, CalendarDays, Shirt, ClipboardList,
  Radio, Image, Newspaper, PenLine, Medal, Star, Hand, Handshake,
  BarChart2, Settings, LogOut, LogIn, ChevronLeft, ChevronRight,
  Plus, Trash2, Pencil, CheckCircle, XCircle, AlertCircle,
  MapPin, Link, Smartphone, Facebook, Twitter, Copy, Check,
  Zap, Circle, Square, Shield, Lock, Mail, Phone, Globe,
  Upload, Download, Eye, EyeOff, Search, Filter, RefreshCw,
  PlayCircle, Tv, Tv2, Mic, Shuffle, GitBranch, Award, Crown,
  TrendingUp, Clock, Flag, Layers, Tag, Bell, BellRing, BellOff, Info,
  ChevronDown, ChevronUp, X, Menu, LayoutDashboard,
  FileText, ScrollText, Megaphone, Bookmark, SlidersHorizontal,
  UserPlus, UserCheck, UserCircle2, Package, Activity, Target, Hash,
  ArrowLeft, ArrowRight, ExternalLink, AlertTriangle, Grid,
  List, ToggleLeft, ToggleRight, Maximize2, Minimize2, Loader2, PanelLeftClose, PanelLeftOpen,
  Heart, CircleDot, ClipboardEdit, CircleCheck,
  Key, Flame, Timer, Play, Pause, StopCircle, CheckCircle2,
  Swords, BadgeCheck, ShieldCheck, ShieldAlert, Ban
} from 'lucide-vue-next'

export const icons = {
  Home, Trophy, Users, User, Calendar, CalendarDays, Shirt, ClipboardList,
  Radio, Image, Newspaper, PenLine, Medal, Star, Hand, Handshake,
  BarChart2, Settings, LogOut, LogIn, ChevronLeft, ChevronRight,
  Plus, Trash2, Pencil, CheckCircle, XCircle, AlertCircle,
  MapPin, Link, Smartphone, Facebook, Twitter, Copy, Check,
  Zap, Circle, Square, Shield, Lock, Mail, Phone, Globe,
  Upload, Download, Eye, EyeOff, Search, Filter, RefreshCw,
  PlayCircle, Tv, Tv2, Mic, Shuffle, GitBranch, Award, Crown,
  TrendingUp, Clock, Flag, Layers, Tag, Bell, BellRing, BellOff, Info,
  ChevronDown, ChevronUp, X, Menu, LayoutDashboard,
  FileText, ScrollText, Megaphone, Bookmark, SlidersHorizontal,
  UserPlus, UserCheck, UserCircle2, Package, Activity, Target, Hash,
  ArrowLeft, ArrowRight, ExternalLink, AlertTriangle, Grid,
  List, ToggleLeft, ToggleRight, Maximize2, Minimize2, Loader2, PanelLeftClose, PanelLeftOpen,
  Heart, CircleDot, ClipboardEdit, CircleCheck,
  Key, Flame, Timer, Play, Pause, StopCircle, CheckCircle2,
  Swords, BadgeCheck, ShieldCheck, ShieldAlert, Ban
}

export function registerIcons(app) {
  Object.entries(icons).forEach(([name, component]) => {
    app.component(`Icon${name}`, component)
  })
}
