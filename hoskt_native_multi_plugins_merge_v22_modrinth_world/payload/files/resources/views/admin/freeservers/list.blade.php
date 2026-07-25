@extends('layouts.admin')

@section('title')
    Free Servers
@endsection

@section('content-header')
    <h1>Free Servers <small>Manage free server packages, edit times.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li class="active">Free Servers</li>
    </ol>
@endsection

@section('content')
    <div class="row">
        <div class="col-xs-12 col-lg-8">
            <div class="box box-primary">
                <div class="box-header">
                    <h3 class="box-title">Server Packages</h3>
                    <div class="box-tools">
                        <a class="btn btn-success btn-sm" href="{{ route('admin.freeservers.create') }}">New</a>
                    </div>
                </div>
                <div class="box-body table-responsive no-padding">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Name</th>
                                <th>Egg(s)</th>
                                <th>Node(s)</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach ($packages as $package)
                                <tr>
                                    <td>{{ $package->id }}</td>
                                    <td>{{ $package->name }}</td>
                                    <td><a href="javascript:;" title="{{ $package->egg_names }}" data-toggle="tooltip" data-placement="top">Show</a></td>
                                    <td><a href="javascript:;" title="{{ $package->node_names }}" data-toggle="tooltip" data-placement="top">Show</a></td>
                                    <td>
                                        <a class="btn btn-primary btn-xs" href="{{ route('admin.freeservers.view', $package->id) }}"><i class="fa fa-pencil"></i> Edit</a>
                                        <button class="btn btn-danger btn-xs" data-action="delete" data-id="{{ $package->id }}"><i class="fa fa-trash"></i> Delete</button>
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div class="col-xs-12 col-lg-4">
            <div class="box box-primary">
                <div class="box-header">
                    <h3 class="box-title">Settings</h3>
                </div>
                <form method="post" action="{{ route('admin.freeservers.settings') }}">
                    <div class="box-body">
                        <div class="form-group">
                            <label for="limit">Free Server Limit</label>
                            <input type="number" id="limit" name="limit" class="form-control" placeholder="1" value="{{ old('limit', $limit) }}">
                        </div>
                        <div class="form-group">
                            <label for="time">Renew Time</label>
                            <div class="input-group">
                                <input type="number" id="time" name="time" class="form-control" placeholder="24" value="{{ old('time', $time) }}">
                                <span class="input-group-addon">hour(s)</span>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="delete">Delete Time (after the server suspended)</label>
                            <div class="input-group">
                                <input type="number" id="delete" name="delete" class="form-control" placeholder="24" value="{{ old('delete', $delete) }}">
                                <span class="input-group-addon">hour(s)</span>
                            </div>
                            <span class="text-muted small">If you set it to <code>0</code>, the server will be deleted immediately when it's suspended.</span>
                        </div>
                    </div>
                    <div class="box-footer">
                        {!! csrf_field() !!}
                        <button class="btn btn-success pull-right" type="submit">Save</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
@endsection

@section('footer-scripts')
    @parent

    <script>
        $('[data-action="delete"]').click(function (event) {
            event.preventDefault();
            let self = $(this);
            swal({
                title: '',
                type: 'warning',
                text: 'Are you sure you want to delete this package?',
                showCancelButton: true,
                confirmButtonText: 'Delete',
                confirmButtonColor: '#d9534f',
                closeOnConfirm: false,
                showLoaderOnConfirm: true,
                cancelButtonText: 'Cancel',
            }, function () {
                $.ajax({
                    method: 'DELETE',
                    url: '{{ route('admin.freeservers.delete') }}',
                    headers: {'X-CSRF-TOKEN': $('meta[name="_token"]').attr('content')},
                    data: {
                        id: self.data('id')
                    }
                }).done((data) => {
                    swal({
                        type: 'success',
                        title: 'Success!',
                        text: 'You have successfully deleted this package.'
                    });

                    self.parent().parent().slideUp();
                }).fail(() => {
                    swal({
                        type: 'error',
                        title: 'Ooops!',
                        text: 'A system error has occurred! Please try again later...'
                    });
                });
            });
        });
    </script>
@endsection
