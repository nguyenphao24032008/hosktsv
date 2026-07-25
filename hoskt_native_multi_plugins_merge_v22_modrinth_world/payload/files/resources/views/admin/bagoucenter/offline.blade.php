@extends('layouts.admin')

@section('title')
    Bagou Center
@endsection

@section('content-header')
    <h1>Bagou Center<small>External API unavailable.</small></h1>
@endsection

@section('content')
<div class="row">
    <div class="col-xs-12">
        <div class="box box-warning">
            <div class="box-header with-border">
                <h3 class="box-title">Bagou API Offline</h3>
            </div>
            <div class="box-body">
                Panel không kết nối được tới <code>api.bagou450.com</code>. Mình đã chặn lỗi 500 để trang admin không bị trắng.
                Các plugin native trong server vẫn hoạt động độc lập với trang Bagou này.
            </div>
        </div>
    </div>
</div>
@endsection
