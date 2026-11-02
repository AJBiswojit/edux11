import { useQuery } from '@tanstack/react-query'
import request from '@/api/client'

export const useAdminSimilarIssues = () =>
  useQuery({
    queryKey: ['admin', 'similar-issues'],
    queryFn: () => request({ url: '/admin/similar-issues' }).then((r) => r.data),
  })

export const useAdminExams = () =>
  useQuery({
    queryKey: ['admin', 'exams'],
    queryFn: () => request({ url: '/admin/exams' }).then((r) => r.data),
  })
