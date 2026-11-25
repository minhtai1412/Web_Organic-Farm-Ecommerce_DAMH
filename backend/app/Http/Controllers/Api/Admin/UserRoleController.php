<?php

/*
 * Luồng quản trị: quản lý tài khoản và phân quyền người dùng (CV04.28).
 */

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\NguoiDung;
use App\Models\VaiTro;
use App\Traits\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class UserRoleController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:150'],
            'role' => ['nullable', 'string', 'max:50'],
            'status' => ['nullable', 'in:active,locked'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
            'page' => ['nullable', 'integer', 'min:1'],
        ], [
            'search.max' => 'Từ khóa tìm kiếm không được vượt quá 150 ký tự.',
            'status.in' => 'Trạng thái tài khoản không hợp lệ.',
            'per_page.max' => 'Số tài khoản mỗi trang tối đa là 50.',
        ]);

        $query = NguoiDung::query()->with('vaiTro');
        $search = trim((string) ($validated['search'] ?? ''));
        if ($search !== '') {
            $query->where(function (Builder $builder) use ($search): void {
                $builder->where('Ho_ten', 'like', "%{$search}%")
                    ->orWhere('Email', 'like', "%{$search}%")
                    ->orWhere('So_dien_thoai', 'like', "%{$search}%");
                if (ctype_digit($search)) {
                    $builder->orWhere('Ma_nguoi_dung', (int) $search);
                }
            });
        }

        if (! empty($validated['role'])) {
            $roleFilter = $validated['role'];
            $query->whereHas('vaiTro', function (Builder $roleQuery) use ($roleFilter): void {
                if (ctype_digit($roleFilter)) {
                    $roleQuery->where('Ma_vai_tro', (int) $roleFilter);
                } else {
                    $roleQuery->whereRaw('LOWER(Ten_vai_tro) = ?', [strtolower($roleFilter)]);
                }
            });
        }

        if (($validated['status'] ?? null) === 'active') {
            $query->where('Trang_thai', 'Hoat_dong');
        } elseif (($validated['status'] ?? null) === 'locked') {
            $query->where('Trang_thai', 'Khoa');
        }

        $paginator = $query
            ->orderByDesc('Ma_nguoi_dung')
            ->paginate((int) ($validated['per_page'] ?? 15));

        $customerRoleId = VaiTro::query()->where('Ten_vai_tro', 'Customer')->value('Ma_vai_tro');
        $stats = [
            'total' => NguoiDung::query()->count(),
            'staff' => NguoiDung::query()->when(
                $customerRoleId,
                fn (Builder $builder) => $builder->where('Ma_vai_tro', '!=', $customerRoleId)
            )->count(),
            'customers' => $customerRoleId
                ? NguoiDung::query()->where('Ma_vai_tro', $customerRoleId)->count()
                : 0,
            'locked' => NguoiDung::query()->where('Trang_thai', 'Khoa')->count(),
        ];

        return $this->successResponse(
            'Lấy danh sách tài khoản thành công.',
            [
                'users' => $paginator->getCollection()
                    ->map(fn (NguoiDung $user): array => $this->formatUser($user, $request))
                    ->all(),
                'stats' => $stats,
            ],
            meta: [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ]
        );
    }

    public function storeStaff(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ho_ten' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150', 'unique:nguoi_dung,Email'],
            'so_dien_thoai' => [
                'required',
                'regex:/^(?:\\+?84|0)(?:3|5|7|8|9)[0-9]{8}$/',
                'unique:nguoi_dung,So_dien_thoai',
            ],
            'mat_khau' => ['required', 'string', 'min:8', 'max:128'],
            'vai_tro' => ['required', 'integer', 'exists:vai_tro,Ma_vai_tro'],
        ], $this->validationMessages());

        $role = VaiTro::query()->findOrFail($validated['vai_tro']);
        if (! in_array($role->Ten_vai_tro, ['Admin', 'Sales', 'Farm_Staff'], true)) {
            throw ValidationException::withMessages([
                'vai_tro' => ['Chỉ có thể tạo tài khoản nhân viên với vai trò Admin, Sales hoặc Farm Staff.'],
            ]);
        }

        $user = DB::transaction(function () use ($validated, $role): NguoiDung {
            return NguoiDung::query()->create([
                'Ma_vai_tro' => $role->Ma_vai_tro,
                'Ho_ten' => trim($validated['ho_ten']),
                'Email' => strtolower(trim($validated['email'])),
                'So_dien_thoai' => $validated['so_dien_thoai'],
                'Mat_khau_ma_hoa' => Hash::make($validated['mat_khau']),
                'Trang_thai' => 'Hoat_dong',
            ]);
        });

        return $this->successResponse(
            'Tạo tài khoản nhân viên thành công.',
            $this->formatUser($user->load('vaiTro'), $request),
            status: 201
        );
    }

    public function update(int $id, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ho_ten' => ['sometimes', 'required', 'string', 'max:150'],
            'email' => [
                'sometimes',
                'required',
                'email',
                'max:150',
                Rule::unique('nguoi_dung', 'Email')->ignore($id, 'Ma_nguoi_dung'),
            ],
            'so_dien_thoai' => [
                'sometimes',
                'nullable',
                'regex:/^(?:\\+?84|0)(?:3|5|7|8|9)[0-9]{8}$/',
                Rule::unique('nguoi_dung', 'So_dien_thoai')->ignore($id, 'Ma_nguoi_dung'),
            ],
            'mat_khau' => ['nullable', 'string', 'min:8', 'max:128'],
            'vai_tro' => ['sometimes', 'required', 'integer', 'exists:vai_tro,Ma_vai_tro'],
        ], $this->validationMessages());

        $user = DB::transaction(function () use ($id, $request, $validated): NguoiDung {
            $user = NguoiDung::query()->whereKey($id)->lockForUpdate()->firstOrFail();
            $newRoleId = (int) ($validated['vai_tro'] ?? $user->Ma_vai_tro);
            $adminRoleId = VaiTro::query()->where('Ten_vai_tro', 'Admin')->value('Ma_vai_tro');

            if (
                (string) $user->Ma_nguoi_dung === (string) $request->user()->getAuthIdentifier()
                && $user->Ma_vai_tro == $adminRoleId
                && $newRoleId !== (int) $adminRoleId
            ) {
                throw ValidationException::withMessages([
                    'vai_tro' => ['Bạn không thể tự gỡ vai trò Quản trị viên của chính mình.'],
                ]);
            }

            if (
                $user->Trang_thai === 'Hoat_dong'
                && $user->Ma_vai_tro == $adminRoleId
                && $newRoleId !== (int) $adminRoleId
            ) {
                $this->ensureAnotherActiveAdminExists($adminRoleId);
            }

            $attributes = [];
            foreach (['ho_ten' => 'Ho_ten', 'email' => 'Email', 'so_dien_thoai' => 'So_dien_thoai'] as $input => $column) {
                if (array_key_exists($input, $validated)) {
                    $attributes[$column] = $input === 'email'
                        ? strtolower(trim((string) $validated[$input]))
                        : ($input === 'ho_ten' ? trim((string) $validated[$input]) : $validated[$input]);
                }
            }
            if (array_key_exists('vai_tro', $validated)) {
                $attributes['Ma_vai_tro'] = $newRoleId;
            }
            if (! empty($validated['mat_khau'])) {
                $attributes['Mat_khau_ma_hoa'] = Hash::make($validated['mat_khau']);
            }

            $user->update($attributes);

            return $user->refresh()->load('vaiTro');
        });

        return $this->successResponse('Cập nhật tài khoản thành công.', $this->formatUser($user, $request));
    }

    public function toggleStatus(int $id, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ly_do_khoa' => ['nullable', 'string', 'max:1000'],
        ], [
            'ly_do_khoa.max' => 'Lý do khóa không được vượt quá 1.000 ký tự.',
        ]);

        return $this->changeStatus($id, $request, $validated['ly_do_khoa'] ?? null);
    }

    public function updateStatus(int $id, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:Hoat_dong,Khoa'],
            'ly_do_khoa' => ['nullable', 'string', 'max:1000'],
        ], [
            'status.required' => 'Vui lòng chọn trạng thái tài khoản.',
            'status.in' => 'Trạng thái tài khoản không hợp lệ.',
            'ly_do_khoa.max' => 'Lý do khóa không được vượt quá 1.000 ký tự.',
        ]);

        return $this->changeStatus($id, $request, $validated['ly_do_khoa'] ?? null, $validated['status']);
    }

    private function changeStatus(
        int $id,
        Request $request,
        ?string $reason,
        ?string $requestedStatus = null
    ): JsonResponse {
        $user = DB::transaction(function () use ($id, $request, $reason, $requestedStatus): NguoiDung {
            $target = NguoiDung::query()->whereKey($id)->lockForUpdate()->firstOrFail();
            $newStatus = $requestedStatus
                ?? ($target->Trang_thai === 'Hoat_dong' ? 'Khoa' : 'Hoat_dong');

            if (
                (string) $target->Ma_nguoi_dung === (string) $request->user()->getAuthIdentifier()
                && $newStatus === 'Khoa'
            ) {
                throw ValidationException::withMessages([
                    'status' => ['Bạn không thể tự khóa tài khoản đang đăng nhập.'],
                ]);
            }

            if (
                $target->Trang_thai === 'Hoat_dong'
                && $newStatus === 'Khoa'
                && $target->Ma_vai_tro == VaiTro::query()->where('Ten_vai_tro', 'Admin')->value('Ma_vai_tro')
            ) {
                $this->ensureAnotherActiveAdminExists($target->Ma_vai_tro);
            }

            if ($newStatus === 'Khoa' && trim((string) $reason) === '') {
                throw ValidationException::withMessages([
                    'ly_do_khoa' => ['Vui lòng nhập lý do khóa tài khoản.'],
                ]);
            }

            $target->update([
                'Trang_thai' => $newStatus,
                'Ly_do_khoa' => $newStatus === 'Khoa' ? trim((string) $reason) : null,
            ]);

            if ($newStatus === 'Khoa') {
                $target->tokens()->delete();
            }

            return $target->refresh()->load('vaiTro');
        });

        return $this->successResponse(
            $user->Trang_thai === 'Khoa' ? 'Đã khóa tài khoản và thu hồi các phiên đăng nhập.' : 'Đã mở khóa tài khoản.',
            $this->formatUser($user, $request)
        );
    }

    private function ensureAnotherActiveAdminExists(int|string|null $adminRoleId): void
    {
        $activeAdmins = NguoiDung::query()
            ->where('Ma_vai_tro', $adminRoleId)
            ->where('Trang_thai', 'Hoat_dong')
            ->lockForUpdate()
            ->get(['Ma_nguoi_dung']);

        if ($activeAdmins->count() <= 1) {
            throw ValidationException::withMessages([
                'vai_tro' => ['Không thể gỡ vai trò hoặc khóa Quản trị viên đang hoạt động cuối cùng.'],
            ]);
        }
    }

    private function formatUser(NguoiDung $user, Request $request): array
    {
        return [
            'id' => (int) $user->Ma_nguoi_dung,
            'name' => $user->Ho_ten,
            'email' => $user->Email,
            'phone' => $user->So_dien_thoai,
            'role' => [
                'id' => (int) $user->Ma_vai_tro,
                'name' => $user->vaiTro?->Ten_vai_tro,
                'slug' => $user->getRoleSlug(),
            ],
            'status' => $user->Trang_thai,
            'lock_reason' => $user->Ly_do_khoa,
            'created_at' => $user->created_at,
            'is_current_user' => (string) $user->Ma_nguoi_dung === (string) $request->user()->getAuthIdentifier(),
        ];
    }

    private function validationMessages(): array
    {
        return [
            'ho_ten.required' => 'Vui lòng nhập họ và tên.',
            'ho_ten.max' => 'Họ và tên không được vượt quá 150 ký tự.',
            'email.required' => 'Vui lòng nhập địa chỉ email.',
            'email.email' => 'Địa chỉ email không đúng định dạng.',
            'email.unique' => 'Địa chỉ email này đã được sử dụng.',
            'so_dien_thoai.required' => 'Vui lòng nhập số điện thoại.',
            'so_dien_thoai.regex' => 'Số điện thoại phải đúng định dạng di động Việt Nam.',
            'so_dien_thoai.unique' => 'Số điện thoại này đã được sử dụng.',
            'mat_khau.required' => 'Vui lòng nhập mật khẩu khởi tạo.',
            'mat_khau.min' => 'Mật khẩu phải có ít nhất 8 ký tự.',
            'mat_khau.max' => 'Mật khẩu không được vượt quá 128 ký tự.',
            'vai_tro.required' => 'Vui lòng chọn vai trò.',
            'vai_tro.exists' => 'Vai trò được chọn không tồn tại.',
        ];
    }
}
