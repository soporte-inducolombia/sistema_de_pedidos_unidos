<?php

namespace App\Http\Controllers\Admin;

use App\Exports\AllOrdersExport;
use App\Http\Controllers\Controller;
use Illuminate\Http\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class OrderExportController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(): BinaryFileResponse|Response
    {
        return Excel::download(new AllOrdersExport, 'pedidos-'.now()->format('Y-m-d').'.xlsx');
    }
}
