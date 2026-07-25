@extends('layouts.admin')

@section('title')
    Free Servers
@endsection

@section('content-header')
    <h1>Free Servers <small>Edit free server package.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li><a href="{{ route('admin.freeservers') }}">Free Servers</a></li>
        <li class="active">View</li>
    </ol>
@endsection

@section('content')
    <div class="row">
        <div class="col-xs-12">
            <div class="box box-primary">
                <div class="box-header">
                    <h3 class="box-title">Edit Package</h3>
                    <div class="box-tools">
                        <a href="{{ route('admin.freeservers') }}" class="btn btn-sm btn-warning">Go Back</a>
                    </div>
                </div>
                <form method="post" action="{{ route('admin.freeservers.view', $package->id) }}">
                    <div class="box-body">
                        <div class="row">
                            <div class="form-group col-xs-12 col-lg-6">
                                <label for="name">Name</label>
                                <input type="text" class="form-control" id="name" name="name" placeholder="Package Name" value="{{ old('name', $package->name) }}">
                            </div>
                            <div class="form-group col-xs-12 col-lg-6">
                                <label for="image">Image</label>
                                <input type="text" class="form-control" id="image" name="image" placeholder="Image URL" value="{{ old('image', $package->image) }}">
                            </div>
                        </div>
                        <hr>
                        <div class="row">
                            <div class="form-group col-xs-12 col-lg-6">
                                <label for="node_ids">Node(s)</label>
                                <select class="form-control" id="node_ids" name="node_ids[]" multiple>
                                    @foreach ($nodes as $node)
                                        <option value="{{ $node->id }}" {{ in_array($node->id, old('node_ids', explode(',', $package->node_ids))) ? 'selected' : '' }}>{{ $node->name }}</option>
                                    @endforeach
                                </select>
                            </div>
                            <div class="form-group col-xs-12 col-lg-6">
                                <label for="egg_ids">Egg(s)</label>
                                <select class="form-control" id="egg_ids" name="egg_ids[]" multiple>
                                    @foreach ($eggs as $egg)
                                        <option value="{{ $egg->id }}" {{ in_array($egg->id, old('egg_ids', explode(',', $package->egg_ids))) ? 'selected' : '' }}>{{ $egg->name }}</option>
                                    @endforeach
                                </select>
                            </div>
                        </div>
                        <hr>
                        <div class="row">
                            <div class="form-group col-xs-12 col-lg-6">
                                <label for="memory">Memory</label>
                                <div class="input-group">
                                    <input type="number" id="memory" name="memory" class="form-control" placeholder="1024" value="{{ old('memory', $package->memory) }}">
                                    <span class="input-group-addon">MB</span>
                                </div>
                            </div>
                            <div class="form-group col-xs-12 col-lg-6">
                                <label for="disk">Disk</label>
                                <div class="input-group">
                                    <input type="number" id="disk" name="disk" class="form-control" placeholder="1024" value="{{ old('disk', $package->disk) }}">
                                    <span class="input-group-addon">MB</span>
                                </div>
                            </div>
                            <div class="form-group col-xs-12 col-lg-6">
                                <label for="cpu">CPU</label>
                                <div class="input-group">
                                    <input type="number" id="cpu" name="cpu" class="form-control" placeholder="100" value="{{ old('cpu', $package->cpu) }}">
                                    <span class="input-group-addon">%</span>
                                </div>
                            </div>
                            <div class="form-group col-xs-12 col-lg-6">
                                <label for="swap">Swap</label>
                                <div class="input-group">
                                    <input type="number" id="swap" name="swap" class="form-control" placeholder="0" value="{{ old('swap', $package->swap) }}">
                                    <span class="input-group-addon">MB</span>
                                </div>
                            </div>
                        </div>
                        <hr>
                        <div class="row">
                            <div class="form-group col-xs-12 col-lg-4">
                                <label for="database_limit">Database Limit</label>
                                <input type="number" id="database_limit" name="database_limit" class="form-control" placeholder="0" value="{{ old('database_limit', $package->database_limit) }}">
                            </div>
                            <div class="form-group col-xs-12 col-lg-4">
                                <label for="allocation_limit">Allocation Limit</label>
                                <input type="number" id="allocation_limit" name="allocation_limit" class="form-control" placeholder="0" value="{{ old('allocation_limit', $package->allocation_limit) }}">
                            </div>
                            <div class="form-group col-xs-12 col-lg-4">
                                <label for="backup_limit">Backup Limit</label>
                                <input type="number" id="backup_limit" name="backup_limit" class="form-control" placeholder="0" value="{{ old('backup_limit', $package->backup_limit) }}">
                            </div>
                        </div>
                    </div>
                    <div class="box-footer">
                        {!! csrf_field() !!}
                        <button type="submit" class="btn btn-success pull-right">Edit</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
@endsection

@section('footer-scripts')
    @parent

    <script>
        $('#node_ids').select2({
            placeholder: '- Select Node(s) -',
        });

        $('#egg_ids').select2({
            placeholder: '- Select Egg(s) -',
        });
    </script>
@endsection
