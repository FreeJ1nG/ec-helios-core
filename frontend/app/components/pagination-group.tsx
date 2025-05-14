import { Dispatch, SetStateAction } from 'react'

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '~/components/ui/pagination.tsx'

export interface PaginationGroupProps {
  totalPages: number
  page: number
  setPage: Dispatch<SetStateAction<number>>
}

export default function PaginationGroup({
  totalPages,
  page,
  setPage,
}: PaginationGroupProps) {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            data-testid="prev-button"
            onClick={() => page > 1 && setPage(page - 1)}
          />
        </PaginationItem>

        {/* First Page */}
        <PaginationItem>
          <PaginationLink onClick={() => setPage(1)} isActive={page === 1}>
            1
          </PaginationLink>
        </PaginationItem>

        {/* Left Ellipsis */}
        {page > 3 && (
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        )}

        {/* Dynamic Page Links */}
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p !== 1 && p !== totalPages && Math.abs(p - page) <= 2)
          .map(p => (
            <PaginationItem key={p}>
              <PaginationLink onClick={() => setPage(p)} isActive={page === p}>
                {p}
              </PaginationLink>
            </PaginationItem>
          ))}

        {/* Right Ellipsis */}
        {page < totalPages - 2 && (
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        )}

        {/* Last Page */}
        {totalPages > 1 && (
          <PaginationItem>
            <PaginationLink
              onClick={() => setPage(totalPages)}
              isActive={page === totalPages}
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        )}

        <PaginationItem>
          <PaginationNext
            data-testid="next-button"
            onClick={() => page < totalPages && setPage(page + 1)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
